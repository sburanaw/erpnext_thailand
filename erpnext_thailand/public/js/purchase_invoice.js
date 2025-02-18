frappe.ui.form.on("Purchase Invoice", {
    before_load: function(frm) {
        if (frm.doc.__islocal && frm.doc.amended_from) {
            frm.set_value("tax_invoice_number", "");
            frm.set_value("tax_invoice_date", "");
        }
    }
});
