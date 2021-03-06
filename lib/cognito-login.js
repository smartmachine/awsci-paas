const { Construct } = require('@aws-cdk/core');
const { RestApi, Resource, JsonSchemaType } = require('@aws-cdk/aws-apigateway');


const { LambdaApi } = require('./lambda-api');

/**
 * @typedef CognitoLoginOptions
 * @property {RestApi}  api
 * @property {Resource} resource
 */

class CognitoLogin extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {CognitoLoginOptions} options
   */
  constructor(scope, id, options) {
    super(scope, id);

    this._lambda = new LambdaApi(this, 'CognitoLogin', {
      api: options.api,
      resource: options.resource,
      handler: 'cognito-login',
      requestTemplate: '{"code": $input.json("$.authCode")}',
      responseTemplate: '{"state": "ok", "access_token": $input.json("$.access_token")}',
      errorResponseTemplate: '{"state": "error", "message": "$input.path("$.errorMessage")"}',
      requestModelProperties: {
        authCode: {type: JsonSchemaType.STRING}
      },
      responseModelProperties: {
        state: {type: JsonSchemaType.STRING},
        access_token: {type: JsonSchemaType.STRING},
      },
      errorResponseModelProperties: {
        state: {type: JsonSchemaType.STRING},
        message: {type: JsonSchemaType.STRING}
      },
      resourceName: 'login',
      validateRequestBody: true,
      validateRequestParameters: false,
      httpMethod: 'POST'
    });

  }

  get lambda() {
    return this._lambda;
  }

}

module.exports = { CognitoLogin };
