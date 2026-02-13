import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // Aqui poderia enviar para Sentry
    }

    handleRestart = () => {
        // Em produção, Updates.reloadAsync() seria ideal, mas setState resolve para limpar UI
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>🥺</Text>
                    <Text style={styles.title}>Ops! Algo deu errado</Text>
                    <Text style={styles.subtitle}>
                        Não se preocupe, estamos trabalhando nisso.
                    </Text>

                    {this.state.error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {this.state.error.toString()}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={this.handleRestart}
                    >
                        <Text style={styles.buttonText}>Tentar Novamente</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.sizes.xl,
        fontWeight: 'bold',
        color: colors.black,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 16,
        color: colors.gray600,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    errorBox: {
        backgroundColor: colors.gray100,
        padding: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.gray300,
        marginBottom: spacing.xl,
        width: '100%',
    },
    errorText: {
        fontSize: 12,
        color: colors.red,
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: colors.yellow,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: colors.black,
    },
    buttonText: {
        fontWeight: 'bold',
        color: colors.black,
        fontSize: 16,
    },
});
