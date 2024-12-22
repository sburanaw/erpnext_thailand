# Copyright (c) 2024, FLO and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class PaymentReceipt(Document):
    def before_save(self):
        self.update_total_sales_invoice_amount()
        self.update_total_paid_amount()

    def update_total_sales_invoice_amount(self):
        total_sales_invoice_amount = sum([r.grand_total for r in self.billing_references])
        self.total_sales_invoice_amount = total_sales_invoice_amount

    def update_total_paid_amount(self):
        self.total_paid_amount = sum([r.paid_amount for r in self.payment_references])