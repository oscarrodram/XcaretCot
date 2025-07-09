sap.ui.define([], function() {
    "use strict";
    return {
        xFlagToBool: function(sValue) {
            return sValue === "X";
        },
        formatNumberWithCommas: function(nNumber) {
            if (nNumber === undefined || nNumber === null || nNumber === "") {
                return "";
            }
            var num = parseFloat(nNumber);
            if (isNaN(num)) return nNumber;
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        formatTotalText: function(label, total) {
            if (!total) return label + ": $0.00";
            return label + ": $" + total;
        }
    };
});