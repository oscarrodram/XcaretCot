sap.ui.define([
    "sap/ui/core/UIComponent",
    "comxcaretrepcot/comxcaretrepcot/model/models",
    "sap/ui/model/json/JSONModel"
], (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("comxcaretrepcot.comxcaretrepcot.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this.getRouter().initialize();

            var _sQuotationReportServiceUrl = "https://experiencias-xcaret-parques-s-a-p-i-de-c-v--xc-btpdev-15aca4ac6.cfapps.us10-001.hana.ondemand.com/QuotationReport";

            // === Selección dinámica de endpoint según el entorno ===
            var currentUrl = window.location.href || "";
            if (currentUrl.includes("xc-btpdev")) {
                _sQuotationReportServiceUrl = "https://experiencias-xcaret-parques-s-a-p-i-de-c-v--xc-btpdev-15aca4ac6.cfapps.us10-001.hana.ondemand.com/QuotationReport";
            } else if (currentUrl.includes("qas-btp")) {
                _sQuotationReportServiceUrl = "https://node.cfapps.us10-001.hana.ondemand.com/QuotationReport";
            }

            // Fetch inicial al iniciar la app
            fetch(_sQuotationReportServiceUrl)
                .then(response => response.json())
                .then(data => {
                    this.setResultList(data.result);
                })
                .catch(err => {
                    console.error("Error al cargar datos iniciales:", err);
                });
        },

        setResultList: function (aList) { this.oResultList = aList; },
        getResultList: function () { return this.oResultList || []; },

        // ValueHelp dinámico
        /*
        getOptions: function (sInputId, oCurrentFilters) {
            var mFieldMap = {
                "inputNombreProyecto": "PROJECT_NAME",
                "inputCotizacion": "EBELN",
                "inputPedidoXdifica": "QUOTATION_PED_XDIFICA",
                "inputProveedor": "SUPPLIER_NAME",
                "inputMaterial": "MATNR",
                "inputCategoria": "CATEGORY_DESC",
                "inputFamilia": "FAMILY_DESC",
                "inputMarca": "BRAND_DESC",
                "inputModelo": "MODEL_DESC",
                "inputDivision": "REQ_DIVISION_DESC",
                "inputArea": "REQ_AREA_DESC",
                "inputUbicacion": "REQ_UBICA",
                "inputSubUbicacion": "REQ_SUBUBICA",
                "inputRequerimiento": "REQ_ID"
            };
            var sField = mFieldMap[sInputId];
            if (!sField) return [];
            var aResults = this.getResultList();

            // FILTRADO dinámico según los valores actuales de los inputs (ahora soporta arrays)
            if (oCurrentFilters) {
                aResults = aResults.filter(function (item) {
                    return Object.keys(oCurrentFilters).every(function (key) {
                        var filtro = oCurrentFilters[key];
                        if (!filtro || (Array.isArray(filtro) && filtro.length === 0)) {
                            return true;
                        }
                        // Soporte para arrays (selección múltiple)
                        if (Array.isArray(filtro)) {
                            // Conversión a string para comparar correctamente
                            return filtro.map(String).includes(String(item[key]));
                        } else {
                            return String(item[key]) === String(filtro);
                        }
                    });
                });
            }

            // Opciones únicas (sin vacío ni repetidos)
            var aOptions = [];
            var oSeen = {};
            aResults.forEach(function (item) {
                var key = item[sField];
                if (key && !oSeen[key]) {
                    oSeen[key] = true;
                    aOptions.push({ key: key, text: key });
                }
            });

            // Si NO quieres opción vacía, NO agregues nada aquí.
            // Si quisieras opción vacía, usarías: aOptions.unshift({ key: "", text: "" });

            return aOptions;
        }
        */

        getOptions: function (sInputId, oCurrentFilters) {
            var mFieldMap = {
                "inputNombreProyecto": "PROJECT_NAME",
                "inputCotizacion": "EBELN",
                "inputPedidoXdifica": "QUOTATION_PED_XDIFICA",
                "inputProveedor": "SUPPLIER_NAME",
                "inputMaterial": "MATNR", // ← importante, la llave es MATNR
                "inputCategoria": "CATEGORY_DESC",
                "inputFamilia": "FAMILY_DESC",
                "inputMarca": "BRAND_DESC",
                "inputModelo": "MODEL_DESC",
                "inputDivision": "REQ_DIVISION_DESC",
                "inputArea": "REQ_AREA_DESC",
                "inputUbicacion": "REQ_UBICA",
                "inputSubUbicacion": "REQ_SUBUBICA",
                "inputRequerimiento": "REQ_ID"
            };
            var sField = mFieldMap[sInputId];
            if (!sField) return [];
            var aResults = this.getResultList();

            // FILTRADO dinámico según los valores actuales de los inputs (ahora soporta arrays)
            if (oCurrentFilters) {
                aResults = aResults.filter(function (item) {
                    return Object.keys(oCurrentFilters).every(function (key) {
                        var filtro = oCurrentFilters[key];
                        if (!filtro || (Array.isArray(filtro) && filtro.length === 0)) {
                            return true;
                        }
                        if (Array.isArray(filtro)) {
                            return filtro.map(String).includes(String(item[key]));
                        } else {
                            return String(item[key]) === String(filtro);
                        }
                    });
                });
            }

            // Opciones únicas (sin vacío ni repetidos)
            var aOptions = [];
            var oSeen = {};
            aResults.forEach(function (item) {
                var key = item[sField];
                // Lógica especial para inputMaterial:
                if (sInputId === "inputMaterial") {
                    var text = item["MATERIAL_NAME"] || key; // Title será MATERIAL_NAME
                    if (key && !oSeen[key]) {
                        oSeen[key] = true;
                        aOptions.push({ key: key, text: text });
                    }
                } else {
                    var text = key;
                    if (key && !oSeen[key]) {
                        oSeen[key] = true;
                        aOptions.push({ key: key, text: text });
                    }
                }
            });

            return aOptions;
        }

    });
});