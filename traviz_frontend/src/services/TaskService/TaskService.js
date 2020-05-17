import axios from "axios";

let config = require("../../config.json")
let ipPort = config.ipPortBackend
let protocol = config.protocol
const API_URL = protocol + "://" + ipPort

class TaskService {
    async getTasks(traceId) {
        const url = `${API_URL}/tasks/${traceId}`;
        return axios.get(url).then(response => response.data)
    }

    async getRelationships(traceId) {
        const url = `${API_URL}/tasklinks/${traceId}`;
        return axios.get(url).then(response => response.data)
    }
}

export default TaskService
