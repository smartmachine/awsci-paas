const cdk = require('@aws-cdk/core');
const { Stack, App } = require('@aws-cdk/core');
const { StringParameter } = require('@aws-cdk/aws-ssm');
const { Table, AttributeType, ProjectionType } = require('@aws-cdk/aws-dynamodb');

const { StaticSite } = require('./site-construct');
const { Api } = require('./api');
const { CognitoPool } = require('./cognito-construct');



/**
 * @typedef AwsciStackOptions
 * @property {object} stackProps      - The stack properties
 * @property {string} baseDomain      - The base domain name. This will also host the static root site.
 * @property {string} apiDomain       - The api domain name. Lambda functions will be hosted here.
 * @property {string} authDomain      - The auth domain name. Cognito will be hosted here.
 * @property {string} baseCertArn     - The ACM Certificate ARN for the baseDomain.
 * @property {string} wildcardCertArn - The ACM Certificate ARN for *.baseDomain URLs
 * @property {string} callbackUrl     - The URL where Cognito should call back to.
 * @property {string} logoutUrl       - The URL where Cognito sends logouts.
 */

class AwsciStack extends Stack {
  /**
   * @param {App} scope
   * @param {string} id
   * @param {AwsciStackOptions} props
   */
  constructor(scope, id, props) {
    super(scope, id, props.stackProps);

    const staticSite = new StaticSite(this, 'awsci.io', {
      domainName: props.baseDomain,
      certArn:    props.baseCertArn
    });

    const api = new Api(this, 'lambda-api', {
      wildcardCertArn: props.wildcardCertArn,
      baseDomain:      props.baseDomain,
      apiDomain:       props.apiDomain,
    });

    api.node.addDependency(staticSite);

    const cognitoTable = new Table(this, 'CognitoSessions', {
      partitionKey: {
        name: 'user',
        type: AttributeType.STRING
      },
      tableName: 'cognito_sessions',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    cognitoTable.addGlobalSecondaryIndex({
      indexName: 'AccessTokenIndex',
      partitionKey: {
        name: 'access_token',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });

    cognitoTable.grantReadWriteData(api.cognitoLogin.lambda);
    cognitoTable.grantReadWriteData(api.cognitoUserInfo.lambda);
    cognitoTable.grantReadWriteData(api.cognitoRefresh.lambda);

    const cognitoPool = new CognitoPool(this, 'cognito-pool', {
      certificateArn: props.wildcardCertArn,
      authDomain:     props.authDomain,
      baseDomain:     props.baseDomain,
      callbackUrl:    props.callbackUrl,
      logoutUrl:      props.logoutUrl
    });

    cognitoPool.node.addDependency(staticSite);
    cognitoPool.clientIdParameter.grantRead(api.cognitoInfo.lambda);
    cognitoPool.clientIdParameter.grantRead(api.cognitoLogin.lambda);
    cognitoPool.clientIdParameter.grantRead(api.cognitoUserInfo.lambda);
    cognitoPool.clientIdParameter.grantRead(api.cognitoRefresh.lambda);

    api.cognitoUserInfo.addAuthorizer(cognitoPool.userPoolArn);

    const callbackUrlParameter = new StringParameter(this, 'callbackUrlParameter', {
      parameterName: '/cognito/client/callbackUrl',
      stringValue: props.callbackUrl
    });

    callbackUrlParameter.grantRead(api.cognitoInfo.lambda);
    callbackUrlParameter.grantRead(api.cognitoLogin.lambda);
    callbackUrlParameter.grantRead(api.cognitoUserInfo.lambda);
    callbackUrlParameter.grantRead(api.cognitoRefresh.lambda);
  }
}

module.exports = { AwsciStack };
