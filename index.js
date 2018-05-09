'use strict';
const https = require('https');
const constants = require('constants');

// Close dialog with the customer, reporting fulfillmentState of Failed or Fulfilled ("Thanks, your pizza will arrive in 20 minutes")
function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

// --------------- Events -----------------------

function dispatch(intentRequest, callback) {
    console.log(`request received for userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);
    console.log('intentRequest: ', intentRequest);
    const sessionAttributes = intentRequest.sessionAttributes;
    const slots = intentRequest.currentIntent.slots;
    const startTime = slots.StartTime;
    const endTime = slots.EndTime;
    const orderDate = slots.OrderDate;


    getOrders(orderDate, startTime, endTime, function (result, error) {
        if (error) {
            console.log('error');
            callback(close(sessionAttributes, 'ERROR',
                {'contentType': 'PlainText', 'content': `${error}`}));

        } else {
            let string = JSON.stringify(result);
            let obj = JSON.parse(string);
            console.log(obj);

            let numberOfOrders = obj.result.ProcessedOrders;
            let startTime = obj.result.StartTime;
            let endTime = obj.result.EndTime;

            console.log(`number of orders ${numberOfOrders}`);
            console.log(`startTime ${startTime}`);
            console.log(`endTime ${endTime}`);

            callback(close(sessionAttributes, 'Fulfilled',
                {'contentType': 'PlainText', 'content': `There were ${numberOfOrders} orders between ${startTime} and ${endTime}`}));
        }
    });
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        dispatch(event,
            (response) => {
                callback(null, response);
            });
    } catch (err) {
        callback(err);
    }
};


// --------------- Network HTTP Requests -----------------------

// Send data to out API Gateway and parse the response
// The JSON body of the request is provided in the event slot.
const getOrders = function (orderDate, startTime, endTime, callback) {

    let url = constants.url+`${orderDate}&StartTime=${startTime}&EndTime=${endTime}`;

    console.log(`url: ${url}`);

    let req = https.get(url, (res) => {
        let body = "";

        res.on("data", (chunk) => {
            body += chunk;
        });

        res.on("end", () => {
            let result = JSON.parse(body);
            console.log(`Result: ${result}`);

            callback({"result":result});

        });
    }).on("error", (error) => {
        console.log(`Error: ${error}`);
        callback(error);
    });
};
