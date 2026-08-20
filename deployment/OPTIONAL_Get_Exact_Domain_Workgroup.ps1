$ErrorActionPreference = 'Stop'
$cs = Get-CimInstance -ClassName Win32_ComputerSystem
$dnsSuffix = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().DomainName
$fqdn = if ([string]::IsNullOrWhiteSpace($dnsSuffix)) { $env:COMPUTERNAME } else { "$env:COMPUTERNAME.$dnsSuffix" }
$result = [pscustomobject]@{
    ComputerName = [string]$env:COMPUTERNAME
    PartOfDomain = [bool]$cs.PartOfDomain
    Membership   = if ($cs.PartOfDomain) { 'Domain Joined' } else { 'Workgroup' }
    Domain       = if ($cs.PartOfDomain) { [string]$cs.Domain } else { $null }
    Workgroup    = if (-not $cs.PartOfDomain) { [string]$cs.Workgroup } else { $null }
    DnsSuffix    = [string]$dnsSuffix
    Fqdn         = [string]$fqdn
}
Write-Output ('GUESTIDENTITY_JSON=' + ($result | ConvertTo-Json -Compress))
