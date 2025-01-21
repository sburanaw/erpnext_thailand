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
	doc = frappe.get_doc(doctype, docname)
	# Filter out print formats that are not default
	final_print_formats = print_formats.copy()
	for print_format in print_formats:
		pf = frappe.get_cached_doc("Print Format", print_format)
		if is_default_print_format(doc, pf):
			default_formats.append(print_format)
		elif pf.hide_if_not_default:
			final_print_formats.remove(print_format)
	# Only if there is 1 default, set it
	default_format = len(default_formats) == 1 and default_formats[0] or ""
	return {
		"print_formats": final_print_formats,
		"default_format": default_format
	}


def is_default_print_format(doc, print_format):
	is_default = frappe.safe_eval(
		code=print_format.default_condition or "False",
		eval_globals=get_safe_globals(),
		eval_locals={"doc": doc},
	)
	return is_default


def allow_update_standard(doc, method):
	if doc.standard == "Yes":
		prev_doc = doc.get_doc_before_save()
		if prev_doc and (
      			prev_doc.default_condition != doc.default_condition or
      			prev_doc.hide_if_not_default != doc.hide_if_not_default
         	):
			frappe.flags.in_test = 1
