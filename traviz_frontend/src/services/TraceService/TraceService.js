import axios from "axios";

let config = require("../../config.json")
let ipPort = config.ipPortBackend
let protocol = config.protocol
const API_URL = protocol + "://" + ipPort

class TraceService {
    async getAllTraces() {
        const url = `${API_URL}/overview`;
        return axios.get(url).then(response => {
            return response.data;
        })
    }

    async getTrace(id) {
        const url = `${API_URL}/traces/${id}`;
        return axios.get(url).then(response => response.data);
    }

    async searchTraces(tid, tg, sdate, edate, minD, maxD) {
        const url = `${API_URL}/traces`;
        return axios.get(url, {
            params: {
                traceId: tid,
                tag: tg,
                startDate: sdate,
                endDate: edate,
                minDur: minD,
                maxDur: maxD
            }
        }).then(response => response.data)
    }
}

export default TraceService
