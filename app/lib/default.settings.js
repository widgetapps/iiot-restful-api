'use strict';

exports.settings = {
    machine: {
        base: [],
        VI: [],
        TI: [],
        CI: []
    },
    hydrant: {
        base: [{
            key: 'connect-interval',
            name: 'connect-interval',
            datatype: 'int',
            range: [1, 1440],
            unit: 'minutes',
            value: 10
        }],
        TI: [{
            key: 'temperature-interval',
            name: 'temperature-interval',
            datatype: 'int',
            range: [1, 1440],
            unit: 'minutes',
            value: 60
        }],
        EI: [{
            key: 'battery-interval',
            name: 'battery-interval',
            datatype: 'int',
            range: [1, 1440],
            unit: 'minutes',
            value: 60
        }],
        PI: [{
            key: 'pressure-interval',
            name: 'pressure-interval',
            datatype: 'int',
            range: [1, 1440],
            unit: 'minutes',
            value: 5
        },{
            key: 'high-limit',
            name: 'high-limit',
            datatype: 'decimal',
            range: [-101.3, 2397],
            unit: 'kPa',
            value: 2379.46
        },{
            key: 'low-limit',
            name: 'low-limit',
            datatype: 'decimal',
            range: [-101.3, 2397],
            unit: 'kPa',
            value: -99.98
        },{
            key: 'dead-band',
            name: 'dead-band',
            datatype: 'decimal',
            range: [10, 2500],
            unit: 'kPa',
            value: 555
        },{
            key: 'pre-roll',
            name: 'pre-roll',
            datatype: 'int',
            range: [0, 300],
            unit: 'seconds',
            value: 0
        },{
            key: 'post-roll',
            name: 'post-roll',
            datatype: 'int',
            range: [0, 300],
            unit: 'seconds',
            value: 0
        },{
            key: 'start-time',
            name: 'start-time',
            datatype: 'date',
            unit: 'date',
            range: '',
            value: ''
        },{
            key: 'pressure-on-time',
            name: 'pressure-on-time',
            datatype: 'int',
            range: [1, 86400],
            unit: 'seconds',
            value: 1
        },{
            key: 'pressure-off-time',
            name: 'pressure-off-time',
            datatype: 'int',
            range: [0, 86400],
            unit: 'seconds',
            value: 0
        }],
        OI: [{
            key: 'hydrophone-start',
            name: 'hydrophone-start',
            datatype: 'int',
            range: [0, 86399],
            unit: 'seconds',
            value: 25200
        },{
            key: 'hydrophone-count',
            name: 'hydrophone-count',
            datatype: 'int',
            range: [0, 3600],
            unit: 'events per day',
            value: 5
        },{
            key: 'hydrophone-interval',
            name: 'hydrophone-interval',
            datatype: 'int',
            range: [0, 86400],
            unit: 'seconds',
            value: 1800
        },{
            key: 'hydrophone-on-time',
            name: 'hydrophone-on-time',
            datatype: 'int',
            range: [0, 86400],
            unit: 'seconds',
            value: 300
        }],
        NI: [],
        MI: [{
            key: 'rssi-interval',
            name: 'rssi-interval',
            datatype: 'int',
            range: [1, 86400],
            unit: 'seconds',
            value: 600
        }]
    }
};
