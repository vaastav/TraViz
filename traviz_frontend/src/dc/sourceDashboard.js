import React from "react";
import {Row, Col} from "react-flexbox-grid";
import { SourceTable } from "./sourceTable";
import { SourceContext } from "./srcContext";
import { FileChart } from "./fileChart";
import { LineChart } from "./lineChart";

export const SourceDashboard = (props)=> {
    return (
        <div>
            <SourceContext>
            <Row>
                <Col md={8}>
                    <FileChart />
                </Col>
                <Col md={4} >
                    <LineChart />
                </Col>
            </Row>
            </SourceContext>
        </div>
    )
}
