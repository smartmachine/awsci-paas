const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { Code, Runtime, Function } = require('@aws-cdk/aws-lambda');
const { RestApi, Resource, LambdaIntegration, MockIntegration, PassthroughBehavior, JsonSchemaType, JsonSchemaVersion } = require('@aws-cdk/aws-apigateway');
const { Table, AttributeType } = require('@aws-cdk/aws-dynamodb');

const path = require('path');

/**
 * @typedef GithubLoginOptions
 * @property {RestApi}  api
 * @property {Resource} resource
 */

class GithubLogin extends Construct {
    /**
     * @param {Construct} scope
     * @param {string} id
     * @param {GithubLoginOptions} options
   */
    constructor(scope, id, options) {
        super(scope, id);

        // Lambda Function
        const githubLoginLambda = new Function(this, 'githubLoginLambda', {
            runtime: Runtime.GO_1_X,
            handler: 'github-login',
            code: Code.fromAsset(path.join(__dirname, '../../api/github-login.zip')),
            functionName: 'GithubLoginLambda'
        });

        const dynamoTable = new Table(this, 'sessions', {
            partitionKey: {
                name: 'session_id',
                type: AttributeType.STRING
            },
            tableName: 'sessions',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        dynamoTable.grantReadWriteData(githubLoginLambda);

        const integration = new LambdaIntegration(githubLoginLambda, {
            proxy: false,
            allowTestInvoke: true,
            requestTemplates: {
                // You can define a mapping that will build a payload for your integration, based
                //  on the integration parameters that you have specified
                // Check: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
                'application/json': '{"code": $input.json("$.authCode")}'
            },
            // This parameter defines the behavior of the engine is no suitable response template is found
            passthroughBehavior: PassthroughBehavior.NEVER,
            integrationResponses: [
                {
                    // Successful response from the Lambda function, no filter defined
                    //  - the selectionPattern filter only tests the error message
                    // We will set the response status code to 200
                    statusCode: "200",
                    responseTemplates: {
                        // This template takes the "message" result from the Lambda function, adn embeds it in a JSON response
                        // Check https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
                        'application/json': '{"state": "ok", "user": $input.json("$.user"), "session": $input.json("$.session")}'
                    },
                    responseParameters: {
                        // We can map response parameters
                        // - Destination parameters (the key) are the response parameters (used in mappings)
                        // - Source parameters (the value) are the integration response parameters or expressions
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
        const requestModel = options.api.addModel('githubLoginRequestModel', {
            contentType: 'application/json',
            modelName: 'GithubLoginRequestModel',
            schema: {
                'schema': JsonSchemaVersion.DRAFT4,
                'title': 'githubAuthRequest',
                'type': JsonSchemaType.OBJECT,
                'properties': {
                    'authCode': {
                        'type': JsonSchemaType.STRING
                    }
                }
            }
        });

        // We define the JSON Schema for the transformed valid response
        const responseModel = options.api.addModel('githubLoginResponseModel', {
            contentType: 'application/json',
            modelName: 'GithubLoginResponseModel',
            schema: {
                'schema': JsonSchemaVersion.DRAFT4,
                'title': 'githubAuthResponse',
                'type': JsonSchemaType.OBJECT,
                'properties': {
                    'state':   { 'type': JsonSchemaType.STRING },
                    'user':    { 'type': JsonSchemaType.STRING },
                    'session': { 'type': JsonSchemaType.STRING },
                }
            }
        });

        // We define the JSON Schema for the transformed error response
        const errorResponseModel = options.api.addModel('githubLoginErrorResponseModel', {
            contentType: 'application/json',
            modelName: 'GithubLoginErrorResponseModel',
            schema: { 'schema': JsonSchemaVersion.DRAFT4, 'title': 'githubErrorResponse', 'type': JsonSchemaType.OBJECT, 'properties': { 'state': { 'type': JsonSchemaType.STRING }, 'message': { 'type': JsonSchemaType.STRING } } }
        });

        const login = options.resource.addResource('login');

        login.addMethod('OPTIONS', new MockIntegration({
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
        const validator = options.api.addRequestValidator('githubLoginValidator', {
            validateRequestBody: true,
            validateRequestParameters: false
        });

        login.addMethod('POST', integration, {
            // We can mark the parameters as required
            /**
             requestParameters: {
                'method.request.querystring.code': true
            },
             */
            requestModels: {
                'application/json': requestModel
            },
            // We need to set the validator for ensuring they are passed
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
}

module.exports = { GithubLogin };
