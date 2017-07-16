import { User } from '../src/user/models';


const password = process.argv[2];

if ( !password) {
  console.error('Password must be passed in as an argument.');
  process.exit(1);
}


User.forge().hashPassword(password).then((hash) => {

  console.log(hash);
  process.exit(0);
})
.catch((err) => {

  console.error(err);
});

