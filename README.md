![Logo Dark-5](https://user-images.githubusercontent.com/5486127/222903754-6a8fdd7a-78db-4f3c-97c2-b3cf080d9477.png)


# SoftCollab

totally simple stems exchange and notification app

SoftCollab is a simplified "Stem Management System" where musicians can easily share different layers
of their composition through a simplified file management portal. The MVP include only the absolute
essential features and built mainly for the primary producer/composer who will be managing all the
files. Features include:

- CRUD "Projects" - This is usually a song being made with a group of people.
- CRUD "Files" - Different layers/parts/files inside the song. It is called "Stems" in the
  screenshot, which is to be changed.
- The person who creates it is the only "Owner". No admin management for now.
- The Owner can CRUD "Members" ("Shares" in screenshot). Members can CRUD files that they've
  uploaded.
- A chat system that is only one-on-one chats within members of a project. No group chats. Users can
  select multiple users and send a bulk message that would be sent individually by the chat system.
- Authentication system based on Email and OTP. No passwords. If a new member is added > a link is
  sent to them > they click on link > an OTP is sent to their email. They log in with OTP. If they
  want to "Log In" > They input their email on the login screen > OTP. Auth system needs a max 3-5
  tries per hour check per email.
- You can "revoke" a member's access. Suppose i sent a link to the wrong email and the idiot logs
  in. He can't delete anything, but he can send shit to the project. I need to be able to flush him.

Heroku will be used to publish the app and the API to SoftCollab.com AWS will be used for backend:

- S3
- eMail notifs (aws WorkMail)
