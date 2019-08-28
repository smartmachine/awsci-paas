const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { Code, Runtime, Function } = require('@aws-cdk/aws-lambda');
const { RestApi, LambdaIntegration, PassthroughBehavior, JsonSchemaType, JsonSchemaVersion } = require('@aws-cdk/aws-apigateway');
const { EndpointType } = require('@aws-cdk/aws-apigateway/lib/restapi');
const { Certificate } = require('@aws-cdk/aws-certificatemanager');
const { HostedZone, ARecord, AddressRecordTarget } = require('@aws-cdk/aws-route53');
const { ApiGateway } = require('@aws-cdk/aws-route53-targets/lib');
const { Table, AttributeType } = require('@aws-cdk/aws-dynamodb');

const path = require('path');

/**
 * @typedef {Object} LambdaApiOptions
 * @property {string} wildcardCertArn - The domain name where this app will be installed.
 * @property {string} apiDomain       - The domain where the api services will be hosted
 * @property {string} baseDomain      - The base domain for the zone in question
 */

class LambdaApi extends Construct {
    /**
     * @param {Construct} scope
     * @param {string} id
     * @param {LambdaApiOptions} options
     */
    constructor(scope, id, options) {
        super(scope, id);

        const {
            wildcardCertArn,
            apiDomain,
            baseDomain
        } = options;

        // Lambda Function
        const loginLambda = new Function(this, 'loginLambda', {
            runtime: Runtime.GO_1_X,
            handler: 'login',
            code: Code.fromAsset(path.join(__dirname, '../../api/login.zip')),
        });

        const dynamoTable = new Table(this, 'sessions', {
            partitionKey: {
                name: 'session_id',
                type: AttributeType.STRING
            },
            tableName: 'sessions',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        dynamoTable.grantReadWriteData(loginLambda);

        const wildcard    = Certificate.fromCertificateArn(this, 'Wildcard', wildcardCertArn);

        const integration = new LambdaIntegration(loginLambda, {
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

        const api = new RestApi(this, "awsci-api", {
            domainName: {
                domainName: apiDomain,
                endpointType: EndpointType.EDGE,
                certificate: wildcard
            },
        });

        // We define the JSON Schema for the transformed valid response
        const requestModel = api.addModel('RequestModel', {
            contentType: 'application/json',
            modelName: 'RequestModel',
            schema: { 'schema': JsonSchemaVersion.DRAFT4, 'title': 'authRequest', 'type': JsonSchemaType.OBJECT, 'properties': { 'authCode': { 'type': JsonSchemaType.STRING }}}
        });

        // We define the JSON Schema for the transformed valid response
        const responseModel = api.addModel('ResponseModel', {
            contentType: 'application/json',
            modelName: 'ResponseModel',
            schema: {
                'schema': JsonSchemaVersion.DRAFT4,
                'title': 'authResponse',
                'type': JsonSchemaType.OBJECT,
                'properties': {
                    'state':   { 'type': JsonSchemaType.STRING },
                    'user':    { 'type': JsonSchemaType.STRING },
                    'session': { 'type': JsonSchemaType.STRING },
                }
            }
        });

        // We define the JSON Schema for the transformed error response
        const errorResponseModel = api.addModel('ErrorResponseModel', {
            contentType: 'application/json',
            modelName: 'ErrorResponseModel',
            schema: { 'schema': JsonSchemaVersion.DRAFT4, 'title': 'errorResponse', 'type': JsonSchemaType.OBJECT, 'properties': { 'state': { 'type': JsonSchemaType.STRING }, 'message': { 'type': JsonSchemaType.STRING } } }
        });

        const login = api.root.addResource('login');

        // If you want to define parameter mappings for the request, you need a validator
        const validator = api.addRequestValidator('DefaultValidator', {
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

        const zone = HostedZone.fromLookup(this, "zone", {
            domainName: baseDomain,
        });

        new ARecord(this, 'APIAliasRecord', {
            recordName: apiDomain,
            target: AddressRecordTarget.fromAlias(new ApiGateway(api)),
            zone: zone
        });

        new cdk.CfnOutput(this, 'ApiEndpointURL', { value: "https://" + apiDomain, description: "The URL of the API Endpoint" })
    }
}

module.exports = { LambdaApi };