import axios from "axios";

let config = require("../../config.json")
let ipPort = config.ipPortBackend
let protocol = config.protocol
const API_URL = protocol + "://" + ipPort

class AggregateService {
    async getAggregate(traces) {
        const url = `${API_URL}/aggregate`;
        return axios.get(url, {
            params: {
                traces: traces.join(',')
            }
        }).then(response => response.data)
    }
}

export default AggregateService
