const { Construct } = require('@aws-cdk/core');
const { Code, Runtime, Function } = require('@aws-cdk/aws-lambda');
const { RestApi, Resource, LambdaIntegration, MockIntegration, PassthroughBehavior, JsonSchemaType, JsonSchemaVersion } = require('@aws-cdk/aws-apigateway');

const path = require('path');

/**
 * @typedef CognitoInfoOptions
 * @property {RestApi}  api
 * @property {Resource} resource
 */

class CognitoInfo extends Construct {
    /**
     * @param {Construct} scope
     * @param {string} id
     * @param {CognitoInfoOptions} options
   */
    constructor(scope, id, options) {
        super(scope, id);

        // Lambda Function
        const cognitoInfoLambda = new Function(this, 'cognitoInfoLambda', {
            runtime: Runtime.GO_1_X,
            handler: 'cognito-info',
            code: Code.fromAsset(path.join(__dirname, '../../api/cognito-info.zip')),
            functionName: 'CognitoInfoLambda'
        });

        this._lambda = cognitoInfoLambda;

        const integration = new LambdaIntegration(cognitoInfoLambda, {
            proxy: false,
            allowTestInvoke: true,
            requestTemplates: {
                // You can define a mapping that will build a payload for your integration, based
                //  on the integration parameters that you have specified
                // Check: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
                'application/json': '{}'
            },
            passthroughBehavior: PassthroughBehavior.NEVER,
            integrationResponses: [
                {
                    statusCode: "200",
                    responseTemplates: {
                        'application/json': '{"state": "ok", "clientId": $input.json("$.client_id"), "callbackURL": $input.json("$.callback_url")}'
                    },
                    responseParameters: {
                        'method.response.header.Content-Type': "'application/json'",
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Credentials': "'true'"
                    }
                },
                {
                    // For errors, we check if the error message is not empty, get the error data
                    selectionPattern: '(\n|.)+',
                    // We will set the response status code to 200
                    statusCode: "400",
                    responseTemplates: {
                        'application/json': JSON.stringify({ state: 'error', message: "$input.path('$.errorMessage')" })
                    },
                    responseParameters: {
                        'method.response.header.Content-Type': "'application/json'",
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Credentials': "'true'"
                    }
                }
            ]
        });

        // We define the JSON Schema for the transformed valid response
        const responseModel = options.api.addModel('CognitoInfoResponseModel', {
            contentType: 'application/json',
            modelName: 'CognitoInfoResponseModel',
            schema: {
                'schema': JsonSchemaVersion.DRAFT4,
                'title': 'cognitoInfoResponse',
                'type': JsonSchemaType.OBJECT,
                'properties': {
                    'clientId':    { 'type': JsonSchemaType.STRING },
                    'callbackURL': { 'type': JsonSchemaType.STRING }
                }
            }
        });

        // We define the JSON Schema for the transformed error response
        const errorResponseModel = options.api.addModel('CognitoInfoErrorResponseModel', {
            contentType: 'application/json',
            modelName: 'CognitoInfoErrorResponseModel',
            schema: {
                'schema': JsonSchemaVersion.DRAFT4,
                'title': 'cognitoInfoErrorResponse',
                'type': JsonSchemaType.OBJECT,
                'properties': {
                    'state': {
                        'type': JsonSchemaType.STRING
                    },
                    'message': {
                        'type': JsonSchemaType.STRING
                    }
                }
            }
        });

        const info = options.resource.addResource('info');

        info.addMethod('OPTIONS', new MockIntegration({
            integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Credentials': "'false'",
                    'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
                },
            }],
            passthroughBehavior: PassthroughBehavior.NEVER,
            requestTemplates: {
                "application/json": "{\"statusCode\": 200}"
            },
        }), {
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Credentials': true,
                    'method.response.header.Access-Control-Allow-Origin': true,
                },
            }]
        });

        // If you want to define parameter mappings for the request, you need a validator
        const validator = options.api.addRequestValidator('CognitoInfoValidator', {
            validateRequestBody: false,
            validateRequestParameters: false
        });

        info.addMethod('GET', integration, {
            requestValidator: validator,
            methodResponses: [
                {
                    // Successful response from the integration
                    statusCode: '200',
                    // Define what parameters are allowed or not
                    responseParameters: {
                        'method.response.header.Content-Type': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Credentials': true
                    },
                    // Validate the schema on the response
                    responseModels: {
                        'application/json': responseModel
                    }
                },
                {
                    // Same thing for the error responses
                    statusCode: '400',
                    responseParameters: {
                        'method.response.header.Content-Type': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Credentials': true
                    },
                    responseModels: {
                        'application/json': errorResponseModel
                    }
                }
            ]
        });
    }

    get lambda() {
        return this._lambda;
    }
}

module.exports = { CognitoInfo };