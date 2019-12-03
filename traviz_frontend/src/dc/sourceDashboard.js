import React from "react";
import {Row, Col} from "react-flexbox-grid";
import { SourceTable } from "./sourceTable";
import { SourceContext } from "./srcContext";
import { FileChart } from "./fileChart";

export const SourceDashboard = (props)=> {
    return (
        <div>
            <SourceContext>
            <Row>
                <Col md={6} >
                    <SourceTable />
                </Col>
                <Col md={6}>
                    <FileChart />
                </Col>
            </Row>
            </SourceContext>
        </div>
    )
}