import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Alert,
} from "react-native";
import {
  AppleLogo,
  CourtChampLogo,
  FacebookLogo,
  GoogleLogo,
} from "../../assets"; // Your image imports
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  where,
  getDocs,
  query,
} from "firebase/firestore";
import {  signInWithCredential, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../../services/firebase.config';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// GoogleAuthProvider


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [iconScale] = useState(new Animated.Value(1));

  const navigation = useNavigation();

  // Validation for Email
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required.");
    } else if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email address.");
    } else {
      setEmailError("");
    }
  };

  // Validation for Password
  const validatePassword = () => {
    if (!password) {
      setPasswordError("Password is required.");
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
    } else {
      setPasswordError("");
    }
  };

  // Toggle Password Visibility
  const togglePasswordVisibility = () => {
    Animated.sequence([
      Animated.timing(iconScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => setShowPassword(!showPassword));
  };

  // Handle Login Button
  const handleLogin = async () => {
    validateEmail();
    validatePassword();
    if (!emailError && !passwordError && email && password) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in successfully");
        // setFirebaseError("");
        const user = userCredential.user;
        const token = await user.getIdToken(); // Get the Firebase Auth ID token
        const userId = user.uid;

        // Save the token to AsyncStorage
     
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("userId", userId);
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }], // Navigate to the main screen (Tabs)
        }); // Adjust to your home screen
      } catch (error) {
        // setFirebaseError(error.message || "Login failed.");
        Alert.alert("Error","Login failed.");
      }
    }
  };

  // Configure Google Sign-In
  // React.useEffect(() => {
  //   GoogleSignin.configure({
  //     webClientId: "215867687150-gqh2v2j67ul3jtjce1vn4omkpmd0r0m6.apps.googleusercontent.com", // Get from Firebase console
  //   });
  // }, []);

  // Google Sign-In Handler
  // const handleGoogleLogin = async () => {
  //   try {
  //     await GoogleSignin.hasPlayServices();
  //     await GoogleSignin.signOut();
  //     const userInfo = await GoogleSignin.signIn();
  //     const googleCredential = GoogleAuthProvider.credential(userInfo.data.idToken);
  //     const userCredential = await signInWithCredential(auth, googleCredential);
  //     const token = await userCredential.user.getIdToken();
  //     // const methods = await auth.fetchSignInMethodsForEmail(userEmail);
  //     const userId = userCredential.user.uid;
  //     const userData = userInfo.data.user;
  //     // Save the token in AsyncStorage
  //     await AsyncStorage.setItem("userToken", token);
  // await AsyncStorage.setItem("userId", userId);

  //     try {
  //       const usersRef = collection(db, 'users');
  //       const userQuery = query(
  //         usersRef,
  //         // where("provider", "==", "gmail"),
  //         where("email", "==", userData.email)
  //       );

  //       const querySnapshot = await getDocs(userQuery);

  //       if (!querySnapshot.empty) {
  //         const doc = querySnapshot.docs[0];
  //         const user = {
  //           id: doc.id,
  //           ...doc.data(),
  //         };

  //         if (user.provider == 'gmail') {
  //           navigation.reset({
  //             index: 0,
  //             routes: [{ name: "Home" }], // Navigate to the main screen (Tabs)
  //           });
  //         } else {
  //           Alert.alert("Error", "Error in login");
  //         }
  //       } else {
  //         navigation.reset({
  //           index: 0,
  //           routes: [
  //             {
  //               name: "Signup",
  //               params: {
  //                 userName: userData.name,
  //                 userEmail: userData.email,
  //                 userId: userId,
  //               },
  //             },
  //           ],
  //         });
  //       }
  //     } catch (error) {
  //       console.error('Error updating documents: ', error);
  //     }
  //   } catch (error) {
  //     console.error("Google Login Error: ", error.message);
  //   }
  // };

  // const onSocialLogin = (type) => {
  //   if (type === 'google') {
  //     handleGoogleLogin();
  //   }
  // }

  return (
    <>
      <View style={styles.container}>
        {/* Logo Section */}
        <Image source={CourtChampLogo} style={styles.logo} />

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          {/* Email Field */}
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor="#B3B3B3"
              value={email}
              onChangeText={setEmail}
              onBlur={validateEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          {/* Password Field */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
              placeholder="Enter your password"
              placeholderTextColor="#B3B3B3"
              value={password}
              onChangeText={setPassword}
              onBlur={validatePassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={togglePasswordVisibility}
            >
              <Animated.Text
                style={[styles.eyeIcon, { transform: [{ scale: iconScale }] }]}
              >
                {!password ? "" : showPassword ? "👁️" : "🙈"}
              </Animated.Text>
            </TouchableOpacity>
            {passwordError && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}
          </View>

          {/* Sign-In Button */}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
            <View style={styles.underline} />
          </TouchableOpacity>
        </View>

        {/* Social Media Buttons */}
        <View style={styles.socialContainer}>

          {/* <TouchableOpacity onPress={() => { onSocialLogin('google') }}>
            <Image source={GoogleLogo} style={styles.socialIcon} />
          </TouchableOpacity> */}
          <TouchableOpacity>
            <Image source={FacebookLogo} style={styles.socialIcon} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Image source={AppleLogo} style={styles.socialIconApple} />
          </TouchableOpacity>
        </View>

        {/* Register Section */}

        <TouchableOpacity>
          <Text onPress={() => { navigation.navigate('Signup') }} style={styles.registerText}>Register</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#00152B", // Dark blue background
    alignItems: "center",
    justifyContent: "center",
    width: "100%",

    // top:'10px'
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 40,
  },
  inputContainer: {
    width: 320,
    height: 380,
    minWidth: 300,
    padding: 24,
    gap: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    opacity: 1,
    backgroundColor: "#001123",
  },
  inputLabel: {
    width: "90%",
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 5,
    textAlign: "left",
    fontWeight: "bold",
    height: "22px",
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 10, // Space between fields
    minHeight: 40, // Fixed height for input and error message container
  },
  underline: {
    width: "46%",
    height: 1,
    backgroundColor: "#fff",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 5,
    color: "#fff",
    fontSize: 16,
  },
  inputError: {
    // borderColor: "red",
    // borderWidth: 1,
  },
  passwordContainer: {
    width: "100%",
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 10,
  },
  eyeIcon: {
    fontSize: 18,
    color: "#fff",
  },
  errorText: {
    width: "90%",
    color: "red",
    fontSize: 12,
    marginBottom: 2,
    textAlign: "left",
  },
  button: {
    width: "272px",
    height: 50,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  forgotPassword: {
    color: "#fff",

    fontSize: 14,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    width: "85%",
    marginBottom: 30,
    marginTop: 50,
  },
  socialIcon: {
    width: 45,
    height: 45,
    marginHorizontal: 20,
  },
  socialIconApple: {
    width: 40,
    height: 47,
    marginHorizontal: 17,
  },
  registerText: {
    color: "#fff",
    fontSize: 16,

    justifyContent: "flex-start",
  },
});
