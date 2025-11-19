# Copyright (c) 2023, Kitti U. and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
from frappe.utils import flt


class WithholdingTaxCert(Document):
	def validate(self):
		for item in self.withholding_tax_items:
			item.tax_amount = flt((item.tax_base or 0) * (item.tax_rate or 0) / 100, 2)
