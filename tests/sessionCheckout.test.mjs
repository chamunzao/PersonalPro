import assert from "node:assert/strict";
import {
  buildSessionCheckoutSummary,
  hasSessionCheckoutChanges
} from "../src/features/session/sessionCheckoutUtils.js";

const checkout = {
  effort: "Moderado",
  pain: "Dor leve no ombro direito",
  loadProgress: "Subiu carga no leg press",
  nextAction: "Manter agachamento leve na proxima aula"
};

const summary = buildSessionCheckoutSummary(checkout);

assert.equal(
  summary,
  "Check-out da aula:\n- Esforco: Moderado\n- Dor/limitacao: Dor leve no ombro direito\n- Evolucao de carga: Subiu carga no leg press\n- Proxima acao: Manter agachamento leve na proxima aula",
  "checkout summary should format the post-class information for the record history"
);

assert.equal(
  hasSessionCheckoutChanges(checkout),
  true,
  "checkout should count as a session change when any post-class field is filled"
);

assert.equal(
  hasSessionCheckoutChanges({ effort: "", pain: "", loadProgress: "", nextAction: "" }),
  false,
  "empty checkout should not count as a session change"
);

assert.equal(
  buildSessionCheckoutSummary({ effort: "", pain: "", loadProgress: "", nextAction: "" }),
  "",
  "empty checkout should not add noise to saved notes"
);
