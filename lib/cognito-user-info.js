const { Construct } = require('@aws-cdk/core');
const { RestApi, Resource, JsonSchemaType } = require('@aws-cdk/aws-apigateway');

const { LambdaApi} = require('./lambda-api');

/**
 * @typedef CognitoUserInfoOptions
 * @property {RestApi}  api
 * @property {Resource} resource
 */

class CognitoUserInfo extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {CognitoUserInfoOptions} options
   */
  constructor(scope, id, options) {
    super(scope, id);

    this._lambda = new LambdaApi(this, 'CognitoUserInfo', {
      api: options.api,
      resource: options.resource,
      handler: 'cognito-userInfo',
      requestParameters: {
        'method.request.header.Authorization': true,
      },
      requestTemplate: '{"access_token": "$input.params().header.get("Authorization")"}',
      responseTemplate: '{"state": "ok"}',
      errorResponseTemplate: '{"state": "error", "message": "$input.path("$.errorMessage")"}',
      requestModelProperties: {},
      responseModelProperties: {
        state: {type: JsonSchemaType.STRING}
      },
      errorResponseModelProperties: {
        state: {type: JsonSchemaType.STRING},
        message: {type: JsonSchemaType.STRING}
      },
      resourceName: 'userInfo',
      validateRequestBody: false,
      validateRequestParameters: true,
      httpMethod: 'GET'
    });

    this._lambda.setScopes(["profile", "openid", "email", "https://api.awsci.io/user"])

  }

  get lambda() {
    return this._lambda;
  }
}

module.exports = { CognitoUserInfo };