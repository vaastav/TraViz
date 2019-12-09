import axios from "axios";

let config = require("../../config.json")
let ipPort = config.ipPortBackend
let protocol = config.protocol
const API_URL = protocol + "://" + ipPort

class TagService {
    async getAllTags() {
        const url = `${API_URL}/tags`;
        return axios.get(url).then(response => {
            return response.data;
        })
    }
}

export default TagService
