import axios from "axios";

let config = require("../../config.json")
let ipPort = config.ipPortBackend
let protocol = config.protocol
const API_URL = protocol + "://" + ipPort

class SourceService {
    async getSource() {
        const url = `${API_URL}/source`;
        return axios.get(url).then(response => response.data);
    }
}

export default SourceService
