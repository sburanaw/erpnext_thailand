frappe.ui.form.on("Payment Entry", {

	refresh(frm) {
		// Filter company tax address
		frm.set_query("company_tax_address", function () {
			return {
				filters: {
					is_your_company_address: true,
				},
			};
		});
		// Create Deduct Withholding Tax button
		if (frm.doc.docstatus == 0 && frm.doc.references && frm.doc.references.length > 0) {
			frm.trigger("add_withholding_tax_deduction_buttons");
		}
		// Add button to create withholding tax cert
		if (
			frm.doc.docstatus == 1 &&
			frm.doc.payment_type == "Pay" &&
			frm.doc.deductions.length > 0
		) {
			frm.trigger("add_create_withholding_tax_cert_button");
		}
		// Create Clear Undue VAT Journal Entry
		if (frm.doc.docstatus == 1) {
			frm.trigger("add_create_undue_vat_journal_entry_button");
		}
	},

	add_withholding_tax_deduction_buttons: function (frm) {
		// 1. Based On Manual Selection
		frm.add_custom_button(
			__("Based On Manual Selection"),
			function () {
				frm.trigger("manual_deduct_withholding_tax");
			},
			__("Withhold Tax")
		);
		// 2. Based On Paying Document's Line Items
		frappe.call({
			method: "erpnext_thailand.custom.payment_entry.test_require_withholding_tax",
			args: {
				doc: frm.doc,
			},
			callback: function (r) {
				if (r.message) {
					frm.dashboard.add_comment(
						__(
							"Please be noted that, some paying documents may require <b>Withholding Tax Deduction</b>"
						),
						"blue",
						true
					);
					frm.add_custom_button(
						__("Based On Paying Document's Line Items"),
						function () {
							frm.trigger("auto_deduct_withholding_tax");
						},
						__("Withhold Tax")
					);
				}
			},
		});
	},

	add_create_withholding_tax_cert_button: function (frm) {
		frm.add_custom_button(__("Create Withholding Tax Cert"), async function () {
			let income_tax_form = "";
			if (frm.doc.party_type == "Supplier") {
				supplier_type = (
					await frappe.db.get_value(
						frm.doc.party_type,
						frm.doc.party,
						"supplier_type"
					)
				).message.supplier_type;
				if (supplier_type == "Individual") {
					income_tax_form = "PND3";
				} else {
					income_tax_form = "PND53";
				}
			}
			const fields = [
				{
					fieldtype: "Date",
					label: __("Date"),
					fieldname: "date",
					reqd: 1,
				},
				{
					fieldtype: "Select",
					label: __("Income Tax Form"),
					fieldname: "income_tax_form",
					options: "PND3\nPND53",
					default: income_tax_form,
				},
				{
					fieldtype: "Link",
					label: __("Company Address"),
					fieldname: "company_address",
					options: "Address",
					get_query: () => {
						return {
							filters: {
								is_your_company_address: 1,
							},
						};
					},
				},
			];
			frappe.prompt(
				fields,
				function (filters) {
					frm.events.make_withholding_tax_cert(frm, filters);
				},
				__("Withholding Tax Cert"),
				__("Create Withholding Tax Cert")
			);
		});
	},

	add_create_undue_vat_journal_entry_button: function (frm) {
		// Check first whether all tax has been cleared, to add button
		frappe.call({
			method: "erpnext_thailand.custom.custom_api.to_clear_undue_tax",
			args: {
				dt: cur_frm.doc.doctype,
				dn: cur_frm.doc.name,
			},
			callback: function (r) {
				if (r.message == true) {
					// Add button
					frm.add_custom_button(__("Clear Undue Tax"), function () {
						frm.trigger("make_clear_vat_journal_entry");
					});
				}
			},
		});
	},

	manual_deduct_withholding_tax: function (frm) {
		const fields = [ 
			{
				fieldtype: "Link",
				label: __("WHT Type"),
				fieldname: "wht_type",
				options: "Withholding Tax Type",
				reqd: 1,
				get_query: function () {
					return {
						filters: [[
							"Withholding Tax Type",
							"for_payment_type",
							"in",
							[frm.doc.payment_type, "Pay and Receive"]]],
					};
				},
			},
		];
		frappe.prompt(
			fields,
			(filters) => {
				frm.events.manual_add_withholding_tax_deduction(frm, filters);
			},
			__("Deduct Withholding Tax"),
			__("Add Withholding Tax Deduction")
		);
	},

	auto_deduct_withholding_tax: function (frm) {
		frappe.confirm(
			__(
				"Scan through all reference documents for line items that require tax withholding."
			),
			() => {
				frm.trigger("auto_add_withholding_tax_deduction");
			}
		);
	},

	manual_add_withholding_tax_deduction: function (frm, filters) {
		return frappe.call({
			method: "erpnext_thailand.custom.payment_entry.get_withholding_tax_from_type",
			args: {
				filters: filters,
				doc: frm.doc,
			},
			callback: function (r) {
				var d = frm.add_child("deductions");
				d.withholding_tax_type = r.message["withholding_tax_type"];
				d.account = r.message["account"];
				d.cost_center = r.message["cost_center"];
				d.withholding_tax_base = r.message["base"];
				d.amount = r.message["amount"];
				frm.doc.paid_amount = frm.doc.paid_amount - Math.abs(d.amount);
				frm.refresh();
				frappe.show_alert(
					{
						message: __("Deducted {0} for Withholding Tax", [
							d.amount.toLocaleString(),
						]),
						indicator: "green",
					},
					5
				);
			},
		});
	},

	auto_add_withholding_tax_deduction: function (frm) {
		return frappe.call({
			method: "erpnext_thailand.custom.payment_entry.get_withholding_tax_from_docs_items",
			args: {
				doc: frm.doc,
			},
			callback: function (r) {
				var deduct = 0;
				r.message.forEach(function (item) {
					var d = frm.add_child("deductions");
					d.withholding_tax_type = item["withholding_tax_type"];
					d.account = item["account"];
					d.cost_center = item["cost_center"];
					d.withholding_tax_base = item["base"];
					d.amount = item["amount"];
					deduct += d.amount;
				});
				frm.doc.paid_amount = frm.doc.paid_amount - Math.abs(deduct);
				frm.refresh();
				frappe.show_alert(
					{
						message: __("Deducted {0} for Withholding Tax", [deduct.toLocaleString()]),
						indicator: "green",
					},
					5
				);
			},
		});
	},

	make_withholding_tax_cert: function (frm, filters) {
		return frappe.call({
			method: "erpnext_thailand.custom.payment_entry.make_withholding_tax_cert",
			args: {
				filters: filters,
				doc: frm.doc,
			},
			callback: function (r) {
				var doclist = frappe.model.sync(r.message);
				frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
			},
		});
	},

	make_clear_vat_journal_entry() {
		return frappe.call({
			method: "erpnext_thailand.custom.custom_api.make_clear_vat_journal_entry",
			args: {
				dt: cur_frm.doc.doctype,
				dn: cur_frm.doc.name,
			},
			callback: function (r) {
				var doclist = frappe.model.sync(r.message);
				frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
			},
		});
	},

	// --------------- Thai Billing ---------------

	get_invoices_from_sales_billing: function(frm) {
		const fields = [
			{
                fieldtype: "Link",
                label: __("Sales Billing"),
                fieldname: "sales_billing",
                options: "Sales Billing",
                reqd: 0,
				"get_query": function() {
					return {
						"filters": {
                            "company": frm.doc.company,
                            "customer": frm.doc.party,
                            "docstatus": 1,
                            "total_outstanding_amount": [">", 0]
                        }
					}
				}
			},
			{fieldtype:"Check", label: __("Allocate Payment Amount"), fieldname:"allocate_payment_amount", default:1},
		];

		frappe.prompt(fields, function(filters){
			frm.events.get_documents_from_sales_billing(frm, filters);
		}, __("Filters"), __("Get Invoices From Billing"));
	},

	get_documents_from_sales_billing: function(frm, filters) {
		frm.clear_table("references");
		frm.refresh_field("references");

		if(frm.doc.payment_type != "Receive" || frm.doc.party_type != "Customer" || !frm.doc.party) {
			return;
		}

        var sales_billing = filters["sales_billing"];
        frm.set_value("sales_billing", sales_billing);
        if (!sales_billing) { return; }

		frappe.flags.allocate_payment_amount = filters["allocate_payment_amount"];

        // Simply get the selected billing number, and its invoices.
        frappe.db.get_doc(
            "Sales Billing",
            filters["sales_billing"]
        ).then(bill => {
            var invoices = []
            $.each(bill.sales_billing_line, function(i, d) {
                invoices.push(d.sales_invoice);
            })
            // Get invoices data, and 
            frappe.db.get_list("Sales Invoice", {
                fields: ["*"],
                filters: {
                    name: ["in", invoices]
                }
            }).then(records => {
                if (records) {
                    var total_positive_outstanding = 0;
                    var total_negative_outstanding = 0;
                    var voucher_type = "Sales Invoice"

                    $.each(records, function(i, d) {
                        var c = frm.add_child("references");
                        c.reference_doctype = voucher_type;
                        c.reference_name = d.name;
                        c.due_date = d.due_date
                        c.total_amount = d.grand_total;
                        c.outstanding_amount = d.outstanding_amount;
                        c.allocated_amount = d.allocated_amount;

                        if(!in_list(frm.events.get_order_doctypes(frm), voucher_type)) {
                            if(flt(d.outstanding_amount) > 0)
                                total_positive_outstanding += flt(d.outstanding_amount);
                            else
                                total_negative_outstanding += Math.abs(flt(d.outstanding_amount));
                        }
                    });

                    if(total_positive_outstanding > total_negative_outstanding) {
                        if (!frm.doc.paid_amount) {
                            frm.set_value("paid_amount",
                                total_positive_outstanding - total_negative_outstanding);
                        }
                    }
                }
                frm.events.allocate_party_amount_against_ref_docs(frm, frm.doc.paid_amount, true);
            })
        })
	},

    get_invoices_from_purchase_billing: function(frm) {
		const fields = [
			{
                fieldtype: "Link",
                label: __("Purchase Billing"),
                fieldname: "purchase_billing",
                options: "Purchase Billing",
                reqd: 0,
				"get_query": function() {
					return {
						"filters": {
                            "company": frm.doc.company,
                            "supplier": frm.doc.party,
                            "docstatus": 1,
                            "total_outstanding_amount": [">", 0]
                        }
					}
				}
			},
			{fieldtype:"Check", label: __("Allocate Payment Amount"), fieldname:"allocate_payment_amount", default:1},
		];

		frappe.prompt(fields, function(filters){
			frm.events.get_documents_from_purchase_billing(frm, filters);
		}, __("Filters"), __("Get Invoices From Billing"));
	},

	get_documents_from_purchase_billing: function(frm, filters) {
		frm.clear_table("references");
		frm.refresh_field("references");

		if(frm.doc.payment_type != "Pay" || frm.doc.party_type != "Supplier" || !frm.doc.party) {
			return;
		}

        var purchase_billing = filters["purchase_billing"];
        frm.set_value("purchase_billing", purchase_billing);
        if (!purchase_billing) { return; }

		frappe.flags.allocate_payment_amount = filters["allocate_payment_amount"];

        // Simply get the selected billing number, and its invoices.
        frappe.db.get_doc(
            "Purchase Billing",
            filters["purchase_billing"]
        ).then(bill => {
            var invoices = []
            $.each(bill.purchase_billing_line, function(i, d) {
                invoices.push(d.purchase_invoice);
            })
            // Get invoices data, and 
            frappe.db.get_list("Purchase Invoice", {
                fields: ["*"],
                filters: {
                    name: ["in", invoices]
                }
            }).then(records => {
                if (records) {
                    var total_positive_outstanding = 0;
                    var total_negative_outstanding = 0;
                    var voucher_type = "Purchase Invoice"

                    $.each(records, function(i, d) {
                        var c = frm.add_child("references");
                        c.reference_doctype = voucher_type;
                        c.reference_name = d.name;
                        c.due_date = d.due_date
                        c.total_amount = d.grand_total;
                        c.outstanding_amount = d.outstanding_amount;
                        c.allocated_amount = d.allocated_amount;

                        if(!in_list(frm.events.get_order_doctypes(frm), voucher_type)) {
                            if(flt(d.outstanding_amount) > 0)
                                total_positive_outstanding += flt(d.outstanding_amount);
                            else
                                total_negative_outstanding += Math.abs(flt(d.outstanding_amount));
                        }
                    });

                    if(total_positive_outstanding > total_negative_outstanding) {
                        if (!frm.doc.paid_amount) {
                            frm.set_value("paid_amount",
                                total_positive_outstanding - total_negative_outstanding);
                        }
                    }
                }

                frm.events.allocate_party_amount_against_ref_docs(frm, frm.doc.paid_amount, true);

            })
        })
	},



	// --------------- END Thai Billing -----------

});