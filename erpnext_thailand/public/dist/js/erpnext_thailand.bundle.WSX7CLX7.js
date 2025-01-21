(() => {
  // ../erpnext_thailand/erpnext_thailand/public/js/print_format.js
  frappe.provide("erpnext_thailand.print");
  erpnext_thailand.print.print_pdf = function(doc) {
    frappe.call({
      method: "erpnext_thailand.custom.print_format.get_print_formats",
      args: {
        doctype: doc.doctype,
        docname: doc.name
      },
      callback: function(r) {
        if (r.message) {
          let { print_formats, default_format } = r.message;
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
              let print_format = values.print_format;
              let api = "/api/method/frappe.utils.print_format.download_pdf";
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
})();
//# sourceMappingURL=erpnext_thailand.bundle.WSX7CLX7.js.map
