import {baseUrl} from "@terreno/rtk";
import {LoginScreen} from "@terreno/ui";
import {useRouter} from "expo-router";
import type React from "react";
import {useCallback, useState} from "react";
import {betterAuthClient} from "@/lib/betterAuth";
import {syncBetterAuthSession, useAppDispatch} from "@/store/index";

const Login: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: Record<string, string>): Promise<void> => {
      const {email, password} = values;
      setErrorMessage(undefined);
      setIsSubmitting(true);
      try {
        const result = await betterAuthClient.signIn.email({email, password});
        if (result.error) {
          setErrorMessage(result.error.message ?? "Sign in failed.");
          return;
        }
        await syncBetterAuthSession(dispatch);
        router.replace("/(tabs)");
      } catch (error: unknown) {
        console.error("[login] Sign in threw", {baseUrl, error});
        setErrorMessage("Sign in failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, router]
  );

  return (
    <LoginScreen
      error={errorMessage}
      fields={[
        {autoComplete: "off", label: "Email", name: "email", required: true, type: "email"},
        {label: "Password", name: "password", required: true, type: "password"},
      ]}
      loading={isSubmitting}
      onSignUpPress={() => router.push("/signup")}
      onSubmit={handleSubmit}
      title="Welcome"
    />
  );
};

export default Login;
