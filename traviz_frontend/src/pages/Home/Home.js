import React from "react";
import { Link } from "react-router-dom";
import TraceService from "../../services/TraceService/TraceService";
import "./Home.css";

class Home extends React.Component {
    constructor() {
        super();
        this.state = {
            traces: []
        };

        this.traceService = new TraceService();
    }

    componentDidMount() {
        this.traceService.getAllTraces().then(response => {
            this.setState({ traces: response});
        });
        const d3_script = document.createElement("script");
        d3_script.async = false;
        d3_script.src = "https://square.github.io/crossfilter/d3.v3.min.js";
        document.body.appendChild(d3_script);

<<<<<<< 7a1d319ef40a9537eaaa05121ef364dcbd82c315
    renderTraces = () => {
        return this.state.traces.map((trace, id) => {
            return (
                <li id={id}>
                    <Link to={`/dependencies/${trace.ID}`}> {trace.Date} </Link>
                </li>
            )
        })
=======
        const cf_script = document.createElement("script");
        cf_script.asynf = false;
        cf_script.src = "https://square.github.io/crossfilter/crossfilter.v1.min.js";
        document.body.appendChild(cf_script);
>>>>>>> Add basic divs
    }

    render() {
        return (
            <div>
                <div id="charts">
                    <div id="events-chart" class="chart">
                        <div class="title">Number of Events</div>
                    </div>
                    <div id="duration-chart" class="chart">
                        <div class="title">Duration</div>
                    </div>
                    <div id="date-chart" class="chart">
                        <div class="title">Date</div>
                    </div>
                </div>

                <div id="lists">
                    <div id="trace-list" class="list"></div>
                </div>
            </div>
        );
    }
}

export default Home
