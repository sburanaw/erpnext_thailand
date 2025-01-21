frappe.provide("erpnext_thailand.print");

erpnext_thailand.print.print_pdf = function(doc) {
	// Fetch default print formats for the given doctype and docname
	frappe.call({
		method: "erpnext_thailand.custom.print_format.get_print_formats",
		args: {
			doctype: doc.doctype,
			docname: doc.name
		},
		callback: function(r) {
			if (r.message) {
				let { print_formats, default_format } = r.message;
				// Create a dialog to select print format
				let d = new frappe.ui.Dialog({
					title: __("Select Print Format"),
					fields: [
						{
							label: __("Print Format"),
							fieldname: "print_format",
							fieldtype: "Select",
							options: print_formats,
							reqd: 1,
							default: default_format
						}
					],
					primary_action_label: __("Print PDF"),
					primary_action(values) {
						// Redirect to print preview with selected print format
						let print_format = values.print_format;
						let api = "/api/method/frappe.utils.print_format.download_pdf"
						// let print_url = `/printview?doctype=${doctype}&name=${docname}&format=${print_format}&no_letterhead=0`;
						let print_url = `${api}?doctype=${doc.doctype}&name=${doc.name}&format=${print_format}&letterhead=None&no_letterhead=0&_lang=en&key=None`;
						window.open(print_url, "_blank");
						d.hide();
					}
				});
				d.show();
			}
		}
	});
};
