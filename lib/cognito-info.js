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
    });

    this._lambda = cognitoInfoLambda;

    const integration = new LambdaIntegration(cognitoInfoLambda, {
      proxy: false,
      allowTestInvoke: true,
      passthroughBehavior: PassthroughBehavior.NEVER,
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            'application/json': '{"state": "ok", "clientId": $input.json("$.clientId"), "redirectURL": $input.json("$.redirectURL")}'
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
    const responseModel = options.api.addModel('CognitoResponseModel', {
      contentType: 'application/json',
      modelName: 'ResponseModel',
      schema: {
        'schema': JsonSchemaVersion.DRAFT4,
        'title': 'authResponse',
        'type': JsonSchemaType.OBJECT,
        'properties': {
          'clientId':    { 'type': JsonSchemaType.STRING },
          'redirectURL': { 'type': JsonSchemaType.STRING }
        }
      }
    });

    // We define the JSON Schema for the transformed error response
    const errorResponseModel = options.api.addModel('CognitoErrorResponseModel', {
      contentType: 'application/json',
      modelName: 'ErrorResponseModel',
      schema: { 'schema': JsonSchemaVersion.DRAFT4, 'title': 'errorResponse', 'type': JsonSchemaType.OBJECT, 'properties': { 'state': { 'type': JsonSchemaType.STRING }, 'message': { 'type': JsonSchemaType.STRING } } }
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