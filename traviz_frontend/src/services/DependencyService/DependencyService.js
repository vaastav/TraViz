import axios from "axios";

let config = require("../../config.json")
let ipPort = config.ipPortBackend
let protocol = config.protocol
const API_URL = protocol + "://" + ipPort

class DependencyService {
    async getDependency() {
        const url = `${API_URL}/dependency`;
        return axios.get(url).then(response => response.data);
    }
}

export default DependencyService
