__version__ = "1.0.0"

# Monkey patching
# ------------------
import erpnext.accounts.doctype.gl_entry.gl_entry as gl_entry

import erpnext_thailand.custom.monkey_patches as patch

gl_entry.rename_temporarily_named_docs = patch.rename_temporarily_named_docs
