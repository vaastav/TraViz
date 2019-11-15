import React from 'react'
import {Grid,Row,Col} from 'react-flexbox-grid'
import { TraceTable } from "./traceTable";
import { DataContext } from "./cxContext";
import { css } from 'glamor';
import { EventsChart } from './eventsChart';
import { DurationChart } from './durationChart';
import { DateChart } from './dateChart';

export const Dashboard = (props)=>{

    const style = css({
        padding:'1rem',
        marginTop:'2rem'
    })
    return(
        <div {...style}>
        <DataContext>
                <Row>
                    <Col md={6} >
                        <TraceTable />
                    </Col>
                    <Col md={3} >
                    </Col>
                    <Col md={3} >
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
                </Row>
        </DataContext>
        </div>
    )
}
