Pod::Spec.new do |s|
  s.name             = 'VTrustX'
  s.version          = '1.0.0'
  s.summary          = 'Native iOS SDK for VTrustX surveys and CX platform.'
  s.homepage         = 'https://github.com/farookabdullah-VS/VTrustX'
  s.license          = { :type => 'ISC' }
  s.author           = { 'VTrustX' => 'sdk@vtrustx.com' }
  s.source           = { :git => 'https://github.com/farookabdullah-VS/VTrustX.git', :tag => s.version.to_s }
  s.ios.deployment_target = '14.0'
  s.swift_version    = '5.5'
  s.source_files     = 'client/ios-sdk/Sources/VTrustX/**/*.swift'
end
