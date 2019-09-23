const { Construct } = require('@aws-cdk/core');
const { RestApi, Resource, JsonSchemaType } = require('@aws-cdk/aws-apigateway');


const { LambdaApi } = require('./lambda-api');

/**
 * @typedef CognitoRefreshOptions
 * @property {RestApi}  api
 * @property {Resource} resource
 */

class CognitoRefresh extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {CognitoRefreshOptions} options
   */
  constructor(scope, id, options) {
    super(scope, id);

    this._lambda = new LambdaApi(this, 'CognitoRefresh', {
      api: options.api,
      resource: options.resource,
      handler: 'cognito-refresh',
      requestTemplate: '{"access_token": $input.json("$.access_token")}',
      responseTemplate: '{"state": "ok", "access_token": $input.json("$.access_token")}',
      errorResponseTemplate: '{"state": "error", "message": "$input.path("$.errorMessage")"}',
      requestModelProperties: {
        access_token: {type: JsonSchemaType.STRING}
      },
      responseModelProperties: {
        state: {type: JsonSchemaType.STRING},
        access_token: {type: JsonSchemaType.STRING},
      },
      errorResponseModelProperties: {
        state: {type: JsonSchemaType.STRING},
        message: {type: JsonSchemaType.STRING}
      },
      resourceName: 'refresh',
      validateRequestBody: true,
      validateRequestParameters: false,
      httpMethod: 'POST'
    });

  }

  get lambda() {
    return this._lambda;
  }

}

module.exports = { CognitoRefresh };
