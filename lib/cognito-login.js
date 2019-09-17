const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { RestApi, Resource, JsonSchemaType } = require('@aws-cdk/aws-apigateway');
const { Table, AttributeType } = require('@aws-cdk/aws-dynamodb');

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

    const cognitoLogin = new LambdaApi(this, 'CognitoLogin', {
      api:                     options.api,
      resource:                options.resource,
      handler:                 'cognito-login',
      requestTemplate:         '{"code": $input.json("$.authCode")}',
      responseTemplate:        '{"state": "ok", "user": $input.json("$.user"), "access_token": $input.json("$.access_token")}',
      errorResponseTemplate:   '{"state": "error", "message": "$input.path("$.errorMessage")"}',
      requestModelProperties: {
        authCode: { type: JsonSchemaType.STRING }
      },
      responseModelProperties: {
        state:        { type: JsonSchemaType.STRING },
        user:         { type: JsonSchemaType.STRING },
        access_token: { type: JsonSchemaType.STRING },
      },
      errorResponseModelProperties: {
        state:   { type: JsonSchemaType.STRING },
        message: { type: JsonSchemaType.STRING }
      },
      resourceName:              'login',
      validateRequestBody:       true,
      validateRequestParameters: false,
      httpMethod:                'POST'
    });

    this._lambda = cognitoLogin.lambda;

    const cognitoTable = new Table(this, 'CognitoSessions2', {
      partitionKey: {
        name: 'user',
        type: AttributeType.STRING
      },
      tableName: 'cognito_sessions2',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    cognitoTable.grantReadWriteData(cognitoLogin.lambda);

  }

  get lambda() {
    return this._lambda;
  }

}

module.exports = { CognitoLogin };
