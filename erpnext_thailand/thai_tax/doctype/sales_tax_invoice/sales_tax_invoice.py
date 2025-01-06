# Copyright (c) 2023, Kitti U. and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import add_months
from erpnext_thailand.custom.custom_api import get_thai_tax_settings


class SalesTaxInvoice(Document):

	def autoname(self):
		setting = get_thai_tax_settings(self.company)
		if setting.use_doc_name_for_sales_taxinv:
			self.name = self.voucher_no

	def validate(self):
		self.compute_report_date()

	def on_update_after_submit(self):
		if self.get_doc_before_save():  # Some change is made
			self.compute_report_date()

	def compute_report_date(self):
		if int(self.months_delayed) == 0:
			self.db_set("report_date", self.date)
		else:
			self.db_set("report_date", add_months(self.date, int(self.months_delayed)))
