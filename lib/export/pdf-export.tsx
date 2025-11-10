import React from 'react'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'

export interface CountItem {
  product_name: string | null
  quantity: number
  quantity_unit: string
  shelves?: {
    name: string
    corridors?: {
      name: string
      warehouses?: {
        name: string
      }
    }
  } | null
}

export interface MatchResult {
  count_items: CountItem
  erp_items: {
    product_code: string
    product_name: string
    stock_qty: number
  }
  difference: number
}

type ReactPDFModule = typeof import('@react-pdf/renderer')

async function loadReactPDF(): Promise<ReactPDFModule> {
  const reactPDF = await import('@react-pdf/renderer')
  return reactPDF
}

export async function generateCountReportPDF(
  matches: MatchResult[],
  reportTitle: string = 'Sayım Raporu'
): Promise<ReactElement<DocumentProps>> {
  const { Document, Page, Text, View, StyleSheet } = await loadReactPDF()

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 10,
    },
    title: {
      fontSize: 20,
      marginBottom: 20,
      fontWeight: 'bold',
    },
    table: {
      display: 'flex',
      width: 'auto',
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    tableRow: {
      margin: 'auto',
      flexDirection: 'row',
    },
    tableColHeader: {
      width: '20%',
      borderStyle: 'solid',
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      backgroundColor: '#f0f0f0',
      padding: 5,
    },
    tableCol: {
      width: '20%',
      borderStyle: 'solid',
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 5,
    },
    tableCellHeader: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    tableCell: {
      fontSize: 9,
    },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{reportTitle}</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Ürün Adı</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>ERP Kodu</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Sayım Miktarı</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>ERP Stok</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Fark</Text>
            </View>
          </View>
          {matches.map((match, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{match.count_items.product_name || 'Bilinmiyor'}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{match.erp_items.product_code}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {match.count_items.quantity} {match.count_items.quantity_unit}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{match.erp_items.stock_qty}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text
                  style={[
                    styles.tableCell,
                    { color: match.difference !== 0 ? '#dc2626' : '#16a34a' },
                  ]}
                >
                  {match.difference > 0 ? '+' : ''}
                  {match.difference}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

