Feature: Account
  Users of digia must have an account
  Accounts are used to connect various elements

  Scenario: Retrieving Account Information
    Given the system knows about the following account:
      | organization | phone | note | 
      | digia, LLC | 8009991111 | Our testing company | 
    When the client requests the account
    Then the response is an account containing its information
      | attribute | type | value |
      | organization | String | digia, LLC |
      | phone | String | 8009991111 | 
      | note | String | Our testing company | 

