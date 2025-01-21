import frappe
from frappe.utils.safe_exec import get_safe_globals


@frappe.whitelist()
def get_print_formats(doctype, docname):
	# Fetch available print formats for the given doctype
	print_formats = frappe.get_all(
		"Print Format", filters={
      		"doc_type": doctype,
        	"disabled": 0},
  		pluck="name",
		order_by="name"
	)
	default_formats = []
	for print_format in print_formats:
		if is_default_print_format(doctype, docname, print_format):
			default_formats.append(print_format)
	# Only if there is 1 default, set it
	default_format = len(default_formats) == 1 and default_formats[0] or ""
	return {
		"print_formats": print_formats,
		"default_format": default_format
	}


def is_default_print_format(doctype, docname, print_format):
	doc = frappe.get_doc(doctype, docname)
	pf = frappe.get_doc("Print Format", print_format)
	is_default = frappe.safe_eval(
		code=pf.default_condition or "False",
		eval_globals=get_safe_globals(),
		eval_locals={"doc": doc},
	)
	return is_default


def allow_update_standard(doc, method):
	if doc.standard == "Yes":
		prev_doc = doc.get_doc_before_save()
		if prev_doc and prev_doc.default_condition != doc.default_condition:
			frappe.flags.in_test = 1
