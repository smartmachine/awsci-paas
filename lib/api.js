const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { RestApi } = require('@aws-cdk/aws-apigateway');
const { EndpointType } = require('@aws-cdk/aws-apigateway/lib/restapi');
const { Certificate } = require('@aws-cdk/aws-certificatemanager');
const { HostedZone, ARecord, RecordTarget } = require('@aws-cdk/aws-route53');
const { ApiGateway } = require('@aws-cdk/aws-route53-targets/lib');

const { GithubLogin } = require('./github-login');
const { CognitoInfo } = require('./cognito-info');
const { CognitoUserInfo } = require('./cognito-user-info');
const { CognitoLogin } = require('./cognito-login');
const { CognitoRefresh } = require('./cognito-refresh');

/**
 * @typedef {Object} LambdaApiOptions
 * @property {string} wildcardCertArn - The domain name where this app will be installed.
 * @property {string} apiDomain       - The domain where the api services will be hosted
 * @property {string} baseDomain      - The base domain for the zone in question
 */

class Api extends Construct {
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

    const wildcard    = Certificate.fromCertificateArn(this, 'Wildcard', wildcardCertArn);

    const api = new RestApi(this, "awsci-api", {
      domainName: {
        domainName: apiDomain,
        endpointType: EndpointType.EDGE,
        certificate: wildcard
      },
    });

    const github = api.root.addResource('github');

    new GithubLogin(this, "githubLogin", {
      api: api,
      resource: github
    });

    const cognito = api.root.addResource('cognito');

    const cognitoInfo = new CognitoInfo(this, 'cognitoInfo', {
      api: api,
      resource: cognito
    });

    const cognitoLogin = new CognitoLogin(this, 'cognitoLogin', {
      api: api,
      resource: cognito
    });

    const cognitoRefresh = new CognitoRefresh(this, 'cognitoRefresh', {
      api: api,
      resource: cognito
    });

    const cognitoUserInfo = new CognitoUserInfo(this, 'cognitoUserInfo', {
      api: api,
      resource: cognito
    });

    this._cognitoInfo = cognitoInfo.lambda;
    this._cognitoLogin = cognitoLogin.lambda;
    this._cognitoUserInfo = cognitoUserInfo.lambda;
    this._cognitoRefresh = cognitoRefresh.lambda;

    const zone = HostedZone.fromLookup(this, "zone", {
      domainName: baseDomain,
    });

    new ARecord(this, 'APIAliasRecord', {
      recordName: apiDomain,
      target: RecordTarget.fromAlias(new ApiGateway(api)),
      zone: zone
    });

    new cdk.CfnOutput(this, 'ApiEndpointURL', { value: "https://" + apiDomain, description: "The URL of the API Endpoint" })
  }

  get cognitoInfo() {
    return this._cognitoInfo;
  }

  get cognitoLogin() {
    return this._cognitoLogin;
  }

  get cognitoUserInfo() {
    return this._cognitoUserInfo;
  }

  get cognitoRefresh() {
    return this._cognitoRefresh;
  }

}

module.exports = { Api };