import datetime
from collections.abc import Callable
from typing import TYPE_CHECKING, Optional
from frappe.model.naming import (
    getseries,
    determine_consecutive_week_number,
    NAMING_SERIES_PART_TYPES,
    has_custom_parser
)
from frappe.utils import cint, cstr, now_datetime
import frappe

if TYPE_CHECKING:
	from frappe.model.document import Document


def parse_naming_series(
	parts: list[str] | str,
	doctype=None,
	doc: Optional["Document"] = None,
	number_generator: Callable[[str, int], str] | None = None,
) -> str:
	"""Parse the naming series and get next name.

	args:
	        parts: naming series parts (split by `.`)
	        doc: document to use for series that have parts using fieldnames
	        number_generator: Use different counter backend other than `tabSeries`. Primarily used for testing.
	"""

	name = ""
	_sentinel = object()
	if isinstance(parts, str):
		parts = parts.split(".")

	if not number_generator:
		number_generator = getseries

	series_set = False
	today = now_datetime()
	for e in parts:
		if not e:
			continue

		part = ""
		if e.startswith("#"):
			if not series_set:
				digits = len(e)
				part = number_generator(name, digits)
				series_set = True
		elif e == "YY":
			part = today.strftime("%y")
		elif e == "MM":
			part = today.strftime("%m")
		elif e == "DD":
			part = today.strftime("%d")
		elif e == "YYYY":
			part = today.strftime("%Y")
		elif e == "WW":
			part = determine_consecutive_week_number(today)
		elif e == "timestamp":
			part = str(today)

		# ERPNext Thiland Monkey Patch
		# All using date field for YYYY, YY, MM, DD, WWW
		# I.e., PT-.YYYY{date_field}.-
		elif doc and (e.startswith("YYYY{") or doc.get(e, _sentinel) is not _sentinel):
			e = e.replace("YYYY{", "").replace("}", "")
			part = doc.get(e)
			part, _, _ = part.split("-")
		elif doc and (e.startswith("YY{") or doc.get(e, _sentinel) is not _sentinel):
			e = e.replace("YY{", "").replace("}", "")
			part = doc.get(e)
			part, _, _ = part.split("-")
			part = part[-2:]
		elif doc and (e.startswith("MM{") or doc.get(e, _sentinel) is not _sentinel):
			e = e.replace("MM{", "").replace("}", "")
			part = doc.get(e)
			_, part, _ = part.split("-")
		elif doc and (e.startswith("DD{") or doc.get(e, _sentinel) is not _sentinel):
			e = e.replace("DD{", "").replace("}", "")
			part = doc.get(e)
			_, _, part = part.split("-")
		elif doc and (e.startswith("WW{") or doc.get(e, _sentinel) is not _sentinel):
			e = e.replace("WW{", "").replace("}", "")
			part = doc.get(e)
			part = datetime.datetime.strptime(part, "%Y-%m-%d")
			part = determine_consecutive_week_number(part)
		# -------------------------

		elif doc and (e.startswith("{") or doc.get(e, _sentinel) is not _sentinel):
			e = e.replace("{", "").replace("}", "")
			part = doc.get(e)
		elif method := has_custom_parser(e):
			part = frappe.get_attr(method[0])(doc, e)
		else:
			part = e

		if isinstance(part, str):
			name += part
		elif isinstance(part, NAMING_SERIES_PART_TYPES):
			name += cstr(part).strip()

	return name
