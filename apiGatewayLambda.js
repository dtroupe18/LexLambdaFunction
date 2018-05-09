'use strict';

console.log('Loading function');

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();


/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */
exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    switch (event.httpMethod) {
        case 'DELETE':
            dynamo.deleteItem(JSON.parse(event.body), done);
            break;
        case 'GET':
            if(event.queryStringParameters.OrderDate && event.queryStringParameters.StartTime && event.queryStringParameters.EndTime){
                //Date format ://2018-04-26
                var orderDateInput = event.queryStringParameters.OrderDate;
                var orderDateArr = orderDateInput.split("-");
                //Date format ://10/26/2017
                var orderDate = orderDateArr[1]+'/'+orderDateArr[2]+'/'+orderDateArr[0];
                var startTime = timeTo12HrFormat(event.queryStringParameters.StartTime+":00");
                var endTime = timeTo12HrFormat(event.queryStringParameters.EndTime+":00");
                var table_name = event.queryStringParameters.TableName;

                var params = {
                    TableName : table_name,
                    KeyConditionExpression: "EntryDate  = :orderDate and EntryTime between :start_time and :end_date",
                    ExpressionAttributeValues: {
                        ":orderDate":orderDate,
                        ":start_time": startTime,
                        ":end_date": endTime,
                    }
                };

                let total = 0;
                dynamo.query(params, function(err, data) {
                    if (err) {
                        console.log("Error", err);
                        done(err,'');
                    } else {
                        data.Items.forEach(function(element, index, array) {
                            if(total === 0){
                                total =  parseInt(element.ProcessedOrders)
                            }else{
                                total = parseInt(total) + parseInt(element.ProcessedOrders)
                            }
                        });
                    }
                    let result = {
                        "StartTime": event.queryStringParameters.StartTime,
                        "EndTime": event.queryStringParameters.EndTime,
                        "OrderDate": event.queryStringParameters.OrderDate,
                        "ProcessedOrders":total
                    };
                    done(null,result);

                });
            }else{
                dynamo.scan({ TableName: event.queryStringParameters.TableName }, done);
            }
            break;
        case 'POST':
            dynamo.putItem(JSON.parse(event.body), done);
            break;
        case 'PUT':
            dynamo.updateItem(JSON.parse(event.body), done);
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }

};


/**
 *  Function for converting 24 hr time to 12 hour
 * */
function timeTo12HrFormat(time_to_convert)
{   // Take a time in 24 hour format and format it in 12 hour format
    let time_part_array = time_to_convert.split(":");
    let ampm = 'AM';

    if (time_part_array[0] >= 12) {
        ampm = 'PM';
    }

    if (time_part_array[0] > 12) {
        time_part_array[0] = time_part_array[0] - 12;
    }
    return time_part_array[0] + ':' + time_part_array[1] + ':' + time_part_array[2] + ' ' + ampm;
}