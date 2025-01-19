# Monkey patching
# ------------------
import erpnext.accounts.doctype.gl_entry.gl_entry as gl_entry
import erpnext_thailand.custom.gl_entry as patch
gl_entry.rename_temporarily_named_docs = patch.rename_temporarily_named_docs

# About naming document with date on document.
# import frappe.model.naming as origin
# import erpnext_thailand.custom.naming as patch
# origin.parse_naming_series = patch.parse_naming_series
