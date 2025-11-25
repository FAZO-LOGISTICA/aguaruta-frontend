// public/fazo-bridge.js

/**
 * ============================================
 *  FAZO BRIDGE v1.0
 *  Puente de comunicación FAZO <-> IFRAME
 *  (AURA / HUD central  ↔  Apps: AguaRuta, Traslado, etc.)
 * ============================================
 *
 *  Este archivo se carga dentro de cada aplicación hija
 *  (por ejemplo, AguaRuta), a través de un <script src="/fazo-bridge.js">
 *
 *  OBJETIVOS:
 *  - Permitir que el HUD central (FAZO) hable con el iframe.
 *  - AURA puede:
 *      • Saber cuándo la app está lista (READY)
 *      • Enviar comandos (FAZO_COMMAND)
 *      • Recibir respuestas (FAZO_RESPONSE)
 *  - Las apps hijas pueden:
 *      • Procesar comandos (leer tablas, sumar litros, cambiar pestañas, etc.)
 *      • Devolver datos a FAZO
 *
 *  Esta versión:
 *   - Define un protocolo estándar con window.postMessage
 *   - Expone window.FAZO_BRIDGE para lógica específica de cada app
 *   - Incluye handlers básicos (PING / HELLO) como ejemplo
 *
 *  Luego, dentro de AguaRuta podrás hacer:
 *
 *      window.FAZO_BRIDGE.onCommand(async (cmd, respond) => {
 *        if (cmd.action === "GET_RESUMEN_CAMION") {
 *          // ... leer DOM / React / API ...
 *          respond({ ok: true, data: { litros: 12345, entregas: 50 }});
 *          return;
 *        }
 *      });
 *
 *  Y desde el HUD, AURA manda:
 *      iframe.contentWindow.postMessage(
 *        {
 *          type: "FAZO_COMMAND",
 *          action: "GET_RESUMEN_CAMION",
 *          payload: { camion: "A3" }
 *        },
 *        "*"
 *      );
 */

// Evitar re-ejecutar si ya está cargado
if (!window.FAZO_BRIDGE) {
  (function () {
    // ========================================
    //  DETECTAR APLICACIÓN (AguaRuta / Traslado / etc.)
    // ========================================
    var href = window.location.href || "";
    var appName = "fazo-app";

    if (href.includes("aguaruta")) appName = "aguaruta";
    else if (href.includes("traslado")) appName = "traslado";
    else if (href.includes("localhost")) {
      // Heurística simple en local
      if (href.includes("3000")) appName = "aguaruta";
      if (href.includes("3001")) appName = "traslado";
    }

    // ========================================
    //  UTILIDAD PARA ENVIAR RESPUESTAS
    // ========================================
    function sendResponse(event, action, payload) {
      try {
        var msg = {
          type: "FAZO_RESPONSE",
          app: appName,
          action: action || null,
          ok: payload && payload.ok !== undefined ? payload.ok : true,
          data: payload && payload.data !== undefined ? payload.data : payload,
          error: payload && payload.error ? payload.error : null,
          href: window.location.href,
        };

        // Respondemos siempre hacia el parent (FAZO HUD)
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(msg, "*");
        }
      } catch (e) {
        // En caso extremo, no hacer nada.
      }
    }

    // ========================================
    //  SISTEMA DE HANDLERS INTERNO
    // ========================================
    var customHandler = null;

    /**
     * Procesa comandos "básicos" directamente aquí.
     * Si no los conoce, delega a customHandler (definido por la app hija).
     */
    function handleCommand(event, command) {
      if (!command || typeof command !== "object") return;

      var action = command.action;
      var payload = command.payload || {};

      // 1) Comandos básicos integrados en el bridge
      if (action === "PING") {
        sendResponse(event, action, {
          ok: true,
          data: { msg: "PONG from " + appName, href: window.location.href },
        });
        return;
      }

      if (action === "HELLO") {
        sendResponse(event, action, {
          ok: true,
          data: {
            msg: "Hola, soy " + appName + " con FAZO_BRIDGE activo.",
            app: appName,
          },
        });
        return;
      }

      // 2) Comandos que deberían implementar las apps hijas:
      //    - GET_RESUMEN_CAMION
      //    - GET_LITROS_DIA
      //    - LISTAR_NO_ENTREGADAS
      //    - NAVIGATE_TAB
      //
      //    Aquí solo definimos el “gancho” genérico.
      if (typeof customHandler === "function") {
        // El handler de la app se encarga de responder
        try {
          customHandler(command, function (responsePayload) {
            // Respuesta estándar hacia el HUD
            sendResponse(event, action, responsePayload || { ok: true });
          });
        } catch (e) {
          sendResponse(event, action, {
            ok: false,
            error:
              "Error ejecutando customHandler: " +
              (e && e.message ? e.message : "desconocido"),
          });
        }
        return;
      }

      // 3) Si no hay handler, respondemos con NO_IMPLEMENTADO
      sendResponse(event, action, {
        ok: false,
        error:
          "Comando '" +
          action +
          "' recibido en " +
          appName +
          " pero sin customHandler definido.",
      });
    }

    // ========================================
    //  LISTENER GLOBAL DE MENSAJES
    // ========================================
    function onMessage(event) {
      var data = event.data;
      if (!data || typeof data !== "object") return;

      // Solo procesamos mensajes FAZO_COMMAND
      if (data.type !== "FAZO_COMMAND") return;

      // OPCIONAL: aquí podrías validar event.origin
      // para mayor seguridad (ej: limitar a tu dominio Netlify/Render)
      //
      // if (event.origin !== "https://fazo-logistica.cl") return;

      handleCommand(event, {
        action: data.action,
        payload: data.payload || {},
      });
    }

    window.addEventListener("message", onMessage, false);

    // ========================================
    //  API GLOBAL PARA LA APP HIJA
    // ========================================
    window.FAZO_BRIDGE = {
      /**
       * Nombre detectado de la app (aguaruta / traslado / etc.)
       */
      app: appName,

      /**
       * Permite a la app hija registrar un handler para comandos.
       *
       * Ejemplo en AguaRuta:
       *
       *    window.FAZO_BRIDGE.onCommand(async (cmd, respond) => {
       *      if (cmd.action === "GET_RESUMEN_CAMION") {
       *        const { camion } = cmd.payload || {};
       *        // ... obtener datos ...
       *        respond({ ok: true, data: { litros: 50000, entregas: 65 } });
       *      }
       *    });
       *
       * El respond() enviará un FAZO_RESPONSE al HUD.
       */
      onCommand: function (handler) {
        if (typeof handler === "function") {
          customHandler = handler;
        }
      },

      /**
       * Permite a la app hija enviar eventos manuales al HUD,
       * sin que provengan necesariamente de un comando.
       *
       * Ejemplo:
       *
       *    window.FAZO_BRIDGE.sendEvent("STATUS_UPDATE", {
       *      litrosHoy: 123456,
       *      camionesActivos: 5,
       *    });
       */
      sendEvent: function (eventName, data) {
        try {
          var msg = {
            type: "FAZO_EVENT",
            app: appName,
            event: eventName,
            data: data || null,
            href: window.location.href,
          };
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(msg, "*");
          }
        } catch (e) {
          // ignorar
        }
      },
    };

    // ========================================
    //  ANUNCIAR "READY" AL HUD CENTRAL
    // ========================================
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "FAZO_BRIDGE_READY",
            app: appName,
            href: window.location.href,
          },
          "*"
        );
      }
    } catch (e) {
      // si falla, no pasa nada grave
    }
  })();
}
