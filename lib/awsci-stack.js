const cdk = require('@aws-cdk/core');
const { Stack } = require('@aws-cdk/core');
const { Code, Runtime, Function } = require('@aws-cdk/aws-lambda');
const path = require('path');

class AwsciStack extends Stack {
  /**
   * @param {cdk.App} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    new Function(this, 'AWSCI-LAMBDA', {
      runtime: Runtime.GO_1_X,
      handler: 'awsci-api',
      code: Code.fromAsset(path.join(__dirname, '../../awsci-api/awsci-api.zip')),
    });
  }
}

module.exports = { AwsciStack };