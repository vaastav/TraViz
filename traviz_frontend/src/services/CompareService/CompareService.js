import axios from "axios"

let config = require("../../config.json")
let ipPort = config.ipPortBackend
let protocol = config.protocol
const API_URL = protocol + "://" + ipPort

class CompareService {
    async compareTraces(trace1ID, trace2ID) {
        console.log("Trace IDs: ", trace1ID, trace2ID);
        const url = `${API_URL}/compare/${trace1ID}/${trace2ID}`;
        console.log("URL: ", url);
        return axios.get(url).then(response => {
            return response.data;
        });
    }
}

export default CompareService
