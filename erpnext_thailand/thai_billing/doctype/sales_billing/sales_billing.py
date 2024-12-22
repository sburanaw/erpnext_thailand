# Copyright (c) 2023, FLO and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

class SalesBilling(Document):

	def validate(self):
		invoices = [i.sales_invoice for i in self.sales_billing_line]
		if len(invoices) > len(list(set(invoices))):
			frappe.throw(_("Please do not select same sales invoice more than once!"))
		total_outstanding_amount = sum([i.outstanding_amount for i in self.sales_billing_line])
		total_billing_amount = sum([i.grand_total for i in self.sales_billing_line])
		self.total_outstanding_amount = total_outstanding_amount
		self.total_billing_amount = total_billing_amount


@frappe.whitelist()
def get_due_billing(customer=None, currency=None, tax_type=None, threshold_type=None, threshold_date=None):
	if not (customer, currency, tax_type, threshold_date):
		return {}
	filters = {
		"customer": customer,
		"currency": currency,
		"docstatus": 1,
		"outstanding_amount": [">", 0],
	}
	if tax_type:
		filters["taxes_and_charges"] = tax_type
	if threshold_type == "Due Date":
		filters["posting_date"] = ["<=", threshold_date]
	if threshold_type == "Invoice Date":
		filters["due_date"] = ["<=", threshold_date]
	invoices = frappe.get_list(
		"Sales Invoice",
		filters=filters,
		pluck="name"
	)
	return invoices


@frappe.whitelist()
def create_payment_receipt(payment_details, sales_billing_name, posting_date):
    import json
    try:
        payment_details = json.loads(payment_details)
    except Exception:
        frappe.throw(_("Failed to parse payment details. Please check your input."))

    sales_billing = frappe.get_doc('Sales Billing', sales_billing_name)
    customer, company = sales_billing.customer, sales_billing.company
    company_currency = frappe.get_value('Company', company, 'default_currency')
    total_outstanding_amount = sales_billing.total_outstanding_amount
    total_paid_amount = sum(detail['paid_amount'] for detail in payment_details)
    outstanding_amount = total_outstanding_amount - total_paid_amount

    payment_entries = []
    for detail in payment_details:
        mode_of_payment = detail['mode_of_payment']
        paid_to = frappe.get_value("Mode of Payment Account", {"parent": mode_of_payment, "company": company}, "default_account")
        payment_entry = frappe.get_doc({
            'doctype': 'Payment Entry',
            'payment_type': 'Receive',
            'party_type': 'Customer',
            'party': customer,
            'posting_date': posting_date,
            'mode_of_payment': mode_of_payment,
            'bank_account': detail.get('company_bank_account'),
            'party_bank_account': detail.get('party_bank_account'),
            'paid_amount': detail['paid_amount'],
            'received_amount': detail['paid_amount'],
            'company': company,
            'sales_billing': sales_billing_name,
            'target_exchange_rate': 1 if company_currency == sales_billing.currency else 1,
            'paid_to': paid_to,
            'account_currency': company_currency,
            'reference_no': detail.get('chequereference_no'),
            'reference_date': detail.get('chequereference_date'),
        })
        if sales_billing.sales_billing_line:
            for line in sales_billing.sales_billing_line:
                if line.get('sales_invoice'):
                    payment_entry.append('references', {
                        'reference_doctype': 'Sales Invoice',
                        'reference_name': line.sales_invoice,
                        'allocated_amount': detail['paid_amount'],
                        'outstanding_amount': outstanding_amount
                    })
        payment_entry.insert()
        payment_entries.append(payment_entry.name)

    payment_receipt_name = frappe.db.exists('Payment Receipt', {'sales_billing': sales_billing_name, 'company': company})
    if payment_receipt_name:
        payment_receipt = frappe.get_doc('Payment Receipt', payment_receipt_name)
    else:
        payment_receipt = frappe.get_doc({
            'doctype': 'Payment Receipt',
            'sales_billing': sales_billing_name,
            'company': company,
            'customer': customer,
            'posting_date': posting_date,
            'date': posting_date,
            'total_outstanding_amount': total_outstanding_amount,
        }).insert()

    for pe in payment_entries:
        payment_entry_doc = frappe.get_doc('Payment Entry', pe)
        payment_receipt.append('payment_references', {
            'payment_entry': pe,
    })

        if sales_billing.sales_billing_line:
            for line in sales_billing.get("sales_billing_line", []):
                sales_invoice = line.get('sales_invoice')
                frappe.logger().info(f"Processing Sales Invoice: {sales_invoice}")

                if sales_invoice:
                    existing_ref = next((ref for ref in payment_receipt.billing_references if ref.sales_invoice == sales_invoice), None)
                    if existing_ref:
                        existing_ref.allocated_amount += detail['paid_amount']
                        existing_ref.outstanding_amount = outstanding_amount
                    else:
                        payment_receipt.append('billing_references', {
                        'sales_billing': sales_billing_name,
                        'sales_invoice': sales_invoice,
                        'allocated_amount': detail['paid_amount'],
                        'outstanding_amount': outstanding_amount
                    })
    payment_receipt.save()

    return {
        'payment_entries': payment_entries,
        'payment_receipt_names': [payment_receipt.name] 
    }