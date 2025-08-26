import axios from "axios";
export async function evaluatePolicy(opaUrl, input) {
    const { data } = await axios.post(opaUrl, { input });
    return data.result;
}
export async function logDecision(opaAuditUrl, payload) {
    if (!opaAuditUrl)
        return;
    try {
        await axios.post(opaAuditUrl, payload);
    }
    catch {
        // best-effort logging 
    }
}
