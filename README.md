# Code challenge

## Finished thing

Build available at: https://code-chal-stub-jade.vercel.app/

Comments: most of the technical challenge here was figuring out how NextJS and NextAuth work. I spent a while trying to figure it out and then gave up and vibe coded it. I haven't reviewed the code closely and was more focused on the end result.

What is done

* Device fingerprint is checked at login time. Fingerprint is randomised so you can test this from the same device
* New users will only be able to use three devices (more accurately, three logins as each login uses a randomised fingerprint). TODO - check this, it might be 4
* Existing users get a warning when they go over this instead of being blocked

There is a lot more to do:

* name devices when you use them for the first time
* have a way to deregister devices so you can remove old devices. This would need to be rate limited somehow.

Overall I don't feel happy with the code or the end result, I would want to review the code and talk through the approach if this was a real world thing.

(and i just noticed the left padding in the edits is a bit off, that was fixed but it got lost when I reverted the device naming code which had broken the limit checking).

## Problem: Prevent people sharing their Quickli login

Solution:

Do what Netflix do (I think).

There are two parts to the solution:

* Prevent a single login being used in multiple places simultaneously  
* Limit the number of devices that can use a single login, by using fingerprintJS to identify devices.  
* Have users register devices and be able to unregister them as needed. Limit how often that can be done.

Rollout considerations:

* Don’t want to abruptly turn on device limit as it might break current paying users  
* Need to figure out what an acceptable limit is

## Rollout plan

* Pick a reasonable number of devices to start with. 3 seems generous enough as it allows for a phone, work PC and a home PC  
* Enforce this for new users immediately  
* Treat existing users more gently  
  * Email existing users with a nice message like “to be able to continue to provide our wonderful service, Quickli will require device registration and limit the number of devices used to 3 per user.. We understand some users may need some time to transition, so for existing users the device limit will ignored for 30 days, after which time you will need to limit the number of devices per user account” … or something along those lines  
  * Have existing users still need to register devices like normal users. If they already are at their limit, let them continue but show a message that this will be limited in future  
  * After the 30 days are up stop letting users continue past the above if they are above their limit and on an unregistered device.

## Implementation plan

* Punt multi-login prevention to later, for this exercise focus on the device limit  
* Device limit  
  * Step 0: Add fingerprintJS and set it up  
  * Step 1: Add table for registered user devices  
  * Step 2: Add a field to users about whether the user is device-limited or not  
  * Step 2: When user logs in  
    * If their device is in the table, proceed  
    * If their device in not in the table  
      * If they have spare devices, ask if they want to register it.  
        * If they say yes, record it as a registered device and proceed  
        * If they say no, give login error ‘unregistered device’  
      * If they don’t have spare devices  
        * If they are a limited user, give a login error ‘unregistered device and at device limit’  
        * If they are not, show a warning message ‘unregistered device, login will be prevented from 1 May 2025’
