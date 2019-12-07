import React from 'react'
import {Grid,Row,Col} from 'react-flexbox-grid'
import { TraceTable } from "./traceTable";
import { DataContext } from "./cxContext";
import { EventsChart } from './eventsChart';
import { DurationChart } from './durationChart';
import { DateChart } from './dateChart';

export const Dashboard = (props)=>{

    return(
        <div>
        <DataContext>
                <Row>
                    <Col md={6} >
                        <Row>
                            <EventsChart />
                        </Row>
                        <Row>
                            <DurationChart />
                        </Row>
                        <Row>
                            <DateChart />
                        </Row>
                    </Col>
                    <Col md={6} >
                        <TraceTable />
                    </Col>
                </Row>
        </DataContext>
        </div>
    )
}
