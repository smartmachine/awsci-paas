//const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { Code, Runtime, Function } = require('@aws-cdk/aws-lambda');
const { CfnAuthorizer, CfnMethod, RestApi, Resource, LambdaIntegration, MockIntegration, PassthroughBehavior, JsonSchemaType, JsonSchemaVersion } = require('@aws-cdk/aws-apigateway');

const path = require('path');

/**
 * @typedef LambdaApiOptions
 * @property {RestApi}  api
 * @property {Resource} resource
 * @property {string}   handler
 * @property {object}   requestTemplate
 * @property {object}   [requestParameters]
 * @property {string}   responseTemplate
 * @property {string}   errorResponseTemplate
 * @property {object}   requestModelProperties
 * @property {object}   responseModelProperties
 * @property {object}   errorResponseModelProperties
 * @property {string}   resourceName
 * @property {boolean}  validateRequestBody
 * @property {boolean}  validateRequestParameters
 * @property {string}   httpMethod
 */

class LambdaApi extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {LambdaApiOptions} options
   */
  constructor(scope, id, options) {
    super(scope, id);

    this.restApiId = options.api.restApiId;
    this.id = id;

    // Lambda Function
    const lambda = new Function(this, `${id}Lambda`, {
      runtime: Runtime.GO_1_X,
      handler: options.handler,
      code: Code.fromAsset(path.join(__dirname, `../../api/${options.handler}.zip`)),
      functionName: id
    });

    this._lambda = lambda;

    const integration = new LambdaIntegration(lambda, {
      proxy: false,
      allowTestInvoke: true,
      requestTemplates: {
        'application/json': options.requestTemplate
      },
      passthroughBehavior: PassthroughBehavior.NEVER,
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            'application/json': options.responseTemplate
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
            'application/json': options.errorResponseTemplate
          },
          responseParameters: {
            'method.response.header.Content-Type': "'application/json'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Credentials': "'true'"
          }
        }
      ]
    });

    let requestModel = null;

    if (options.requestModelProperties != null) {
      requestModel = options.api.addModel(`${id}RequestModel`, {
        contentType: 'application/json',
        modelName: `${id}RequestModel`,
        schema: {
          schema: JsonSchemaVersion.DRAFT4,
          title: `${id}Request`,
          type: JsonSchemaType.OBJECT,
          properties: options.requestModelProperties,
        }
      });
    }

    // We define the JSON Schema for the transformed valid response
    const responseModel = options.api.addModel(`${id}ResponseModel`, {
      contentType: 'application/json',
      modelName: `${id}ResponseModel`,
      schema: {
        schema: JsonSchemaVersion.DRAFT4,
        title: `${id}Response`,
        type: JsonSchemaType.OBJECT,
        properties: options.responseModelProperties,
      }
    });

    // We define the JSON Schema for the transformed error response
    const errorResponseModel = options.api.addModel(`${id}ErrorResponseModel`, {
      contentType: 'application/json',
      modelName: `${id}ErrorResponseModel`,
      schema: {
        schema: JsonSchemaVersion.DRAFT4,
        title: `${id}ErrorResponse`,
        type: JsonSchemaType.OBJECT,
        properties: options.errorResponseModelProperties
      }
    });

    const res = options.resource.addResource(options.resourceName);

    res.addMethod('OPTIONS', new MockIntegration({
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
    const validator = options.api.addRequestValidator(`${id}Validator`, {
      validateRequestBody: options.validateRequestBody,
      validateRequestParameters: options.validateRequestParameters
    });

    const methodOptions = {
      requestValidator: validator,
      requestParameters: options.requestParameters,
      requestModels: {},
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
          },
        }
      ],

    };

    if (requestModel != null) {
      methodOptions.requestModels = {
        'application/json': requestModel
      }
    }

    this.method = res.addMethod(options.httpMethod, integration, methodOptions);
  }

  get lambda() {
    return this._lambda;
  }

  /**
   * @param {string} userpoolArn
   */
  addAuthorizer(userpoolArn) {
    const authorizer = new CfnAuthorizer(this, `${this.id}Authorizer`, {
      name:           this.id,
      restApiId:      this.restApiId,
      type:           'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userpoolArn],
    });

    const child = this.method.node.findChild('Resource');
    this.override(child, 'AuthorizationType', 'COGNITO_USER_POOLS');
    this.override(child, 'AuthorizerId', { Ref: authorizer.logicalId });
  }

  /**
   * @param {Array.<string>} scopes
   */
  setScopes(scopes) {
    const child = this.method.node.findChild('Resource');
    this.override(child, 'AuthorizationScopes', scopes);
  }

  /**
   * @param {CfnMethod|object} method
   * @param {string}    path
   * @param {object}       value
   */
  override = (method, path, value) => {
    method.addPropertyOverride(path, value)
  };

}

module.exports = { LambdaApi };
